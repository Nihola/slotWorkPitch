// @vitest-environment node
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SMTPServer } from 'smtp-server'
import { simpleParser, type ParsedMail } from 'mailparser'
import { SmtpMailer } from '../mail/mailer'
import { SEEKER, startServer } from './helpers'

/** A real SMTP server on localhost: these tests speak the actual protocol (greeting, AUTH, MAIL FROM, DATA). */
let smtp: SMTPServer, port: number
const received: ParsedMail[] = []
const login = { user: 'mailer', pass: 'secret-pass' }
beforeAll(async () => {
  smtp = new SMTPServer({ authOptional: false, allowInsecureAuth: true, disabledCommands: ['STARTTLS'],
    onAuth(auth, _s, cb) { if (auth.username === login.user && auth.password === login.pass) cb(null, { user: auth.username }); else cb(new Error('Invalid credentials')) },
    onData(stream, _s, cb) { simpleParser(stream).then(m => { received.push(m); cb() }, cb) } })
  await new Promise<void>(r => smtp.listen(0, '127.0.0.1', r)); port = (smtp.server.address() as AddressInfo).port
})
afterAll(async () => { await new Promise<void>(r => smtp.close(() => r())) })
const cfg = (over: object = {}) => ({ mode: 'smtp' as const, from: 'Slotwork <no-reply@slotwork.test>', appUrl: 'https://jobs.example', smtp: { host: '127.0.0.1', port, secure: false, ...login, ...over } })
const waitFor = async (n: number) => { for (let i = 0; i < 100 && received.length < n; i++) await new Promise(r => setTimeout(r, 50)); return received.length >= n }

describe('real SMTP delivery', () => {
  it('SmtpMailer authenticates and delivers a well-formed multipart message', async () => {
    await new SmtpMailer(cfg()).send({ to: 'person@example.org', subject: 'Reset your Slotwork password', text: 'plain https://l/x', html: '<a href="https://l/x">go</a>' })
    expect(await waitFor(1)).toBe(true); const m = received[0]
    expect(m.from?.value[0]).toMatchObject({ name: 'Slotwork', address: 'no-reply@slotwork.test' }); expect(m.to).toMatchObject({ text: 'person@example.org' }); expect(m.subject).toBe('Reset your Slotwork password'); expect(m.text).toContain('https://l/x'); expect(m.html).toContain('<a href="https://l/x">go</a>')
  })
  it('wrong SMTP credentials fail loudly (the app logs it; the user still sees the normal answer)', async () => {
    await expect(new SmtpMailer(cfg({ pass: 'wrong' })).send({ to: 'a@b.co', subject: 's', text: 't', html: 'h' })).rejects.toThrow(/auth|credentials|535/i)
  })
  it('the whole flow over SMTP: request a link by email, set a new password with it, get the confirmation', async () => {
    const t = await startServer({ mail: cfg() }, { mailer: undefined }), start = received.length
    expect((await t.client().post('/api/auth/forgot-password', { email: SEEKER, lang: 'ru' })).status).toBe(204)
    expect(await waitFor(start + 1)).toBe(true); const mail = received[start]
    expect(mail.subject).toBe('Сброс пароля Slotwork'); expect(mail.text).toMatch(/^Здравствуйте, Dilnoza K\.!/)
    const link = mail.text!.match(/https:\/\/jobs\.example\/reset-password\?token=([\w-]+)/); expect(link).toBeTruthy()
    expect((await t.client().post('/api/auth/reset-password', { token: link![1], password: 'viasmtp12345', lang: 'ru' })).status).toBe(204)
    expect(await waitFor(start + 2)).toBe(true); expect(received[start + 1].subject).toBe('Пароль Slotwork изменён')
    expect((await t.client().post('/api/auth/login', { email: SEEKER, password: 'viasmtp12345' })).status).toBe(200)
    await t.close()
  })
  it('an unreachable mail server is logged, not shown: the request still succeeds', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = await startServer({ mail: cfg({ port: 1 }) }, { mailer: undefined })   // nothing listens on port 1
    expect((await t.client().post('/api/auth/forgot-password', { email: SEEKER })).status).toBe(204)
    for (let i = 0; i < 100 && !spy.mock.calls.length; i++) await new Promise(r => setTimeout(r, 50))
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/Email to seeker@demo\.test failed/); spy.mockRestore(); await t.close()
  })
})
