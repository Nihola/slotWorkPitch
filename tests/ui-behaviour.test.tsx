// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import App from '../src/App'
import ErrorBoundary from '../src/components/ErrorBoundary'
import Modal from '../src/components/Modal'
import { authService, DEMO_PASSWORD } from '../src/services/authService'
import { apiConfig } from '../src/api/client'
import { bootServer, stopServer, server } from './serverEnv'

window.scrollTo = () => {}
const T = { timeout: 6000 }
beforeEach(bootServer); afterEach(async () => { cleanup(); await stopServer() })

describe('error boundary', () => {
  const Bomb = ({ boom }: { boom: boolean }) => { if (boom) throw new Error('secret internal stack detail'); return <p>all fine</p> }
  it('shows a friendly screen, hides technical details, and recovers when the route changes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Bomb boom /></ErrorBoundary>)
    expect(screen.getByRole('alert').textContent).toMatch(/Something went wrong\./)
    expect(document.body.textContent).not.toMatch(/secret internal stack detail/)
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
    rerender(<ErrorBoundary resetKey="/b"><Bomb boom={false} /></ErrorBoundary>)
    expect(screen.getByText('all fine')).toBeTruthy(); spy.mockRestore()
  })
})

describe('dialog focus management', () => {
  function Host({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false)
    return (<><button onClick={() => setOpen(true)}>open</button><button>behind</button>
      {open && <Modal title="Test dialog" onClose={() => { setOpen(false); onClose() }}><button>first</button><input aria-label="field" /><button>last</button></Modal>}</>)
  }
  it('moves focus in, traps Tab both ways, closes on Escape and returns focus to the opener', async () => {
    const u = userEvent.setup(), closed = vi.fn(); render(<Host onClose={closed} />)
    const opener = screen.getByRole('button', { name: 'open' }); await u.click(opener)
    const dlg = screen.getByRole('dialog', { name: 'Test dialog' }); expect(document.activeElement).toBe(dlg)
    const [closeBtn] = [screen.getByRole('button', { name: 'Close' })], last = screen.getByRole('button', { name: 'last' })
    await u.tab(); expect(document.activeElement).toBe(closeBtn)
    last.focus(); await u.tab(); expect(document.activeElement).toBe(closeBtn)             // Tab from the last control wraps to the first
    await u.tab({ shift: true }); expect(document.activeElement).toBe(last)                 // Shift+Tab from the first wraps to the last
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'behind' }))  // never escapes behind the dialog
    await u.keyboard('{Escape}'); expect(closed).toHaveBeenCalledTimes(1); expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(opener)
  })
  it('clicking the backdrop closes it, and typing in a field does not steal focus on re-render', async () => {
    const u = userEvent.setup(), closed = vi.fn(); render(<Host onClose={closed} />)
    await u.click(screen.getByRole('button', { name: 'open' })); const field = screen.getByLabelText('field'); await u.click(field); await u.type(field, 'abc')
    expect((field as HTMLInputElement).value).toBe('abc'); expect(document.activeElement).toBe(field)
    fireEvent.click(document.querySelector('button[aria-hidden="true"]')!); expect(closed).toHaveBeenCalledTimes(1)
  })
})

describe('navigation accessibility', () => {
  it('each page sets its own document title', async () => {
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    await waitFor(() => expect(document.title).toBe('Sign in · Slotwork'), T)
    cleanup(); render(<MemoryRouter initialEntries={['/forgot-password']}><App /></MemoryRouter>); await waitFor(() => expect(document.title).toBe('Reset your password · Slotwork'), T)
  })
  it('skip link jumps to main content; navigating moves focus to the new page', async () => {
    await authService.login('seeker@demo.test', DEMO_PASSWORD); const u = userEvent.setup()
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening),/, level: 1 }, T)
    expect(document.title).toBe('Dashboard · Slotwork')
    await u.tab(); const skip = screen.getByRole('link', { name: 'Skip to main content' }); expect(document.activeElement).toBe(skip)
    await u.keyboard('{Enter}'); expect(document.activeElement?.id).toBe('main'); expect(window.location.hash).toBe('')       // no hash change, so it is safe with hash routing
    await u.click(screen.getByRole('link', { name: 'Find jobs' })); await screen.findByRole('heading', { name: /Find work that fits your life/, level: 1 }, T)
    expect(document.activeElement?.id).toBe('main'); expect(document.title).toBe('Find jobs · Slotwork')
  })
})

describe('real-network behaviour', () => {
  const slowDown = (match: RegExp, ms: number) => { const real = apiConfig.fetchImpl; apiConfig.fetchImpl = async (i, init) => { if (match.test(String(i))) await new Promise(r => setTimeout(r, ms)); return real(i, init) }; return () => { apiConfig.fetchImpl = real } }
  it('a slow response for one list never crashes a page that needs two (regression: employer overview)', async () => {
    await authService.login('employer@demo.test', DEMO_PASSWORD); const restore = slowDown(/applications\/employer/, 500)
    render(<MemoryRouter initialEntries={['/employer']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening),/, level: 1 }, T)
    await new Promise(r => setTimeout(r, 200)); expect(screen.queryByText('Something went wrong.')).toBeNull()   // jobs have arrived, applications have not
    await waitFor(() => expect(within(screen.getAllByText('Applications', { selector: 'p' })[0].closest('a')!).getByText('1')).toBeTruthy(), T); restore()
  })
  it('when the server ends the session, the app returns to sign-in instead of showing errors', async () => {
    await authService.login('seeker@demo.test', DEMO_PASSWORD); const u = userEvent.setup()
    render(<MemoryRouter initialEntries={['/dashboard']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening),/, level: 1 }, T)
    server.clock.t += 8 * 24 * 3600_000   // the 7-day session is now expired on the server
    await u.click(screen.getByRole('link', { name: 'Saved' }))
    await screen.findByRole('heading', { name: 'Welcome back', level: 1 }, T)
    server.clock.t = Date.now()
  })
  it('a network failure shows a friendly message and "Try again" recovers', async () => {
    await authService.login('seeker@demo.test', DEMO_PASSWORD); const real = apiConfig.fetchImpl; let fail = true
    apiConfig.fetchImpl = async (i, init) => { if (fail && /\/api\/jobs$/.test(String(i))) throw new TypeError('network down'); return real(i, init) }
    const u = userEvent.setup(); render(<MemoryRouter initialEntries={['/jobs']}><App /></MemoryRouter>)
    expect(await screen.findByText("We couldn't load your opportunities. Please try again.", {}, T)).toBeTruthy(); expect(document.body.textContent).not.toMatch(/network down|TypeError/)
    fail = false; await u.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByText(/6 opportunities/, {}, T)).toBeTruthy(); apiConfig.fetchImpl = real
  })
})
