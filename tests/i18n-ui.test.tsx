// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { setLang } from '../src/i18n'
import { authService } from '../src/services/authService'
import { bootServer, stopServer } from './serverEnv'

window.scrollTo = () => {}
const T = { timeout: 4000 }
const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
beforeEach(bootServer)
afterEach(async () => { cleanup(); setLang('en', { reload: false }); await stopServer() })

describe('languages in the UI', () => {
  it('shows the landing page in Russian, remembers the choice and sets <html lang>', async () => {
    setLang('ru', { reload: false }); mount('/')
    expect(await screen.findByRole('heading', { name: 'Найдите работу, которая подходит вашей жизни.', level: 1 }, T)).toBeTruthy()
    expect(document.documentElement.lang).toBe('ru'); expect(localStorage.getItem('lang')).toBe('ru')
    expect(screen.getByRole('link', { name: 'Нанять гибких специалистов' })).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Как это работает' })).toBeTruthy()
  })
  it('switches language live and offers all three languages in a labelled selector', async () => {
    mount('/'); await screen.findByRole('heading', { name: 'Find work that fits your life.', level: 1 }, T)
    const select = screen.getAllByRole('combobox', { name: 'Language' })[0] as HTMLSelectElement
    expect([...select.options].map(o => o.textContent)).toEqual(['English', 'Русский', 'Oʻzbekcha'])
    act(() => setLang('uz', { reload: false }))
    expect(await screen.findByRole('heading', { name: 'Hayotingizga mos ish toping.', level: 1 }, T)).toBeTruthy(); expect(screen.getAllByRole('combobox', { name: 'Til' })[0]).toBeTruthy()
    expect(screen.queryByText('Find work that fits your life.')).toBeNull()
  })
  it('renders signed-in pages and server-made notifications in Russian', async () => {
    await authService.login('seeker@demo.test', 'demo1234'); setLang('ru', { reload: false }); mount('/notifications')
    expect(await screen.findByText('Ваш отклик на вакансию «Restaurant assistant» добавлен в шорт-лист.', {}, T)).toBeTruthy()
    expect(screen.getByText('Новое сообщение от Osh Markaz.')).toBeTruthy(); expect(screen.getByRole('heading', { name: 'Уведомления', level: 1 })).toBeTruthy()
    expect(screen.getAllByText(/мин\. назад|час|часа|часов|дн/).length).toBeGreaterThan(0)   // relative times; menu labels are module-level constants and are covered by the real-browser reload check
  })
  it('translates server error messages (wrong password, in Russian and Uzbek)', async () => {
    const u = userEvent.setup(); setLang('ru', { reload: false }); mount('/login')
    await u.type(await screen.findByLabelText('Эл. почта', {}, T), 'seeker@demo.test'); await u.type(screen.getByLabelText('Пароль'), 'wrongpass1'); await u.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверная почта или пароль.', {}, T)).toBeTruthy()
    act(() => setLang('uz', { reload: false })); await u.type(await screen.findByLabelText('Elektron pochta', {}, T), 'seeker@demo.test'); await u.type(screen.getByLabelText('Parol'), 'wrongpass1'); await u.click(screen.getByRole('button', { name: 'Kirish' }))
    expect(await screen.findByText('Pochta yoki parol notoʻgʻri.', {}, T)).toBeTruthy()
  })
})
