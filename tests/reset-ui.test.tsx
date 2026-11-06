// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { setLang } from '../src/i18n'
import { bootServer, server, stopServer } from './serverEnv'

window.scrollTo = () => {}
const T = { timeout: 4000 }
const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
const tokenOf = (text: string) => text.match(/token=([\w-]+)/)![1]
beforeEach(bootServer); afterEach(async () => { cleanup(); setLang('en', { reload: false }); await stopServer() })

describe('password reset by email (UI)', () => {
  it('request a link, open it from the email, choose a new password, sign in with it', async () => {
    const u = userEvent.setup(); mount('/forgot-password')
    await u.type(await screen.findByLabelText('Email', {}, T), 'seeker@demo.test'); await u.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/Check your inbox\./, {}, T)).toBeTruthy(); expect(screen.getByText(/seeker@demo\.test/)).toBeTruthy(); expect(document.body.textContent).not.toMatch(/Prototype note|no email is actually sent/)
    expect(server.outbox).toHaveLength(1); const token = tokenOf(server.outbox[0].text)
    cleanup(); mount(`/reset-password?token=${token}`)
    await u.type(await screen.findByLabelText('New password', {}, T), 'brandnew456')
    await u.type(screen.getByLabelText('Confirm new password'), 'different789'); await u.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByText("Passwords don't match.")).toBeTruthy()
    await u.clear(screen.getByLabelText('Confirm new password')); await u.type(screen.getByLabelText('Confirm new password'), 'brandnew456'); await u.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByRole('heading', { name: 'Password updated' }, T)).toBeTruthy(); expect(server.outbox).toHaveLength(2)   // + the "password was changed" confirmation
    cleanup(); mount('/login'); await u.type(await screen.findByLabelText('Email', {}, T), 'seeker@demo.test'); await u.type(screen.getByLabelText('Password'), 'brandnew456'); await u.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening),/, level: 1 }, T)).toBeTruthy()
  })
  it('a used, expired or missing link explains itself and offers a new one', async () => {
    const u = userEvent.setup(); await (await server.as('seeker@demo.test')).post('/api/auth/forgot-password', { email: 'seeker@demo.test' }); const token = tokenOf(server.outbox[0].text)
    await server.client().post('/api/auth/reset-password', { token, password: 'usedonce123' })
    for (const path of [`/reset-password?token=${token}`, '/reset-password', '/reset-password?token=garbage']) {
      cleanup(); mount(path); expect(await screen.findByText('This reset link is invalid or has expired. Request a new one.', {}, T)).toBeTruthy()
      await u.click(screen.getByRole('link', { name: 'Request a new link' })); expect(await screen.findByRole('heading', { name: 'Reset your password' }, T)).toBeTruthy()
    }
  })
  it('weak passwords are refused with a clear message', async () => {
    const u = userEvent.setup(); await server.client().post('/api/auth/forgot-password', { email: 'seeker@demo.test' }); mount(`/reset-password?token=${tokenOf(server.outbox[0].text)}`)
    await u.type(await screen.findByLabelText('New password', {}, T), 'short'); await u.type(screen.getByLabelText('Confirm new password'), 'short'); await u.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeTruthy()
  })
  it('works in Russian, including the email language', async () => {
    const u = userEvent.setup(); setLang('ru', { reload: false }); mount('/forgot-password')
    await u.type(await screen.findByLabelText('Эл. почта', {}, T), 'seeker@demo.test'); await u.click(screen.getByRole('button', { name: 'Отправить ссылку' }))
    expect(await screen.findByText(/Проверьте почту\./, {}, T)).toBeTruthy(); expect(server.outbox[0].subject).toBe('Сброс пароля Slotwork')   // the page sends the current UI language
  })
})
