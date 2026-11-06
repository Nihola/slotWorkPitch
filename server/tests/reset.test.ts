// @vitest-environment node
import http from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { all } from '../db'
import { mailConfig } from '../config'
import { DisabledMailer, MemoryMailer } from '../mail/mailer'
import { renderEmail } from '../mail/templates'
import { SEEKER, newUser, startServer, type TestServer } from './helpers'

const MIN = 60_000
const tokenOf = (text: string) => text.match(/token=([\w-]+)/)![1]
const lastMail = (s: TestServer) => s.outbox[s.outbox.length - 1]
const INVALID = 'This reset link is invalid or has expired. Request a new one.'
let s: TestServer
beforeAll(async () => { s = await startServer() }); afterAll(async () => { await s.close() })

describe('requesting a reset link', () => {
  it('emails real accounts only, answers every request identically, and puts a working link in the message', async () => {
    const c = s.client(), before = s.outbox.length
    const known = await c.post('/api/auth/forgot-password', { email: SEEKER }), unknown = await c.post('/api/auth/forgot-password', { email: 'ghost@nowhere.uz' })
    expect(known.status).toBe(204); expect(unknown.status).toBe(204); expect(known.body).toEqual(unknown.body)
    expect(s.outbox.length).toBe(before + 1)   // nothing was sent for the unknown address
    const m = lastMail(s); expect(m.to).toBe(SEEKER); expect(m.subject).toBe('Reset your Slotwork password')
    expect(m.text).toMatch(/^Hi Dilnoza K\.,/); expect(m.text).toContain('http://localhost:5173/reset-password?token='); expect(m.text).toContain('60 minutes'); expect(m.html).toContain('Choose a new password')
    expect((await c.post('/api/auth/forgot-password', { email: 'not-an-email' })).status).toBe(400)
    expect((await fetch(s.url + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: SEEKER }) })).status).toBe(403)   // CSRF guard
  })
  it('builds the link from configuration, never from the request Host header', async () => {
    const before = s.outbox.length, u = new URL(s.url)
    await new Promise<void>((resolve, reject) => { const req = http.request({ host: u.hostname, port: u.port, path: '/api/auth/forgot-password', method: 'POST', headers: { Host: 'evil.example', 'Content-Type': 'application/json', 'X-Requested-With': 'slotwork' } }, res => { res.resume(); res.on('end', resolve) }); req.on('error', reject); req.end(JSON.stringify({ email: 'employer@demo.test' })) })
    expect(s.outbox.length).toBe(before + 1); expect(lastMail(s).text).not.toContain('evil.example'); expect(lastMail(s).text).toContain('http://localhost:5173/reset-password')
  })
  it('stores only a hash of the token', async () => {
    const { email } = await newUser(s, 'seeker', 'Hash Check'); await s.client().post('/api/auth/forgot-password', { email })
    const token = tokenOf(lastMail(s).text), rows = all<Record<string, unknown>>(s.db, 'SELECT * FROM password_resets')
    expect(JSON.stringify(rows)).not.toContain(token); expect(rows.some(r => /^[0-9a-f]{64}$/.test(String(r.token_hash)))).toBe(true); expect(token.length).toBeGreaterThanOrEqual(40)
  })
  it('writes the email in the requested language (English if missing or unknown)', async () => {
    const { email } = await newUser(s, 'seeker', 'Lang Person'), c = s.client()
    for (const [lang, subject] of [['ru', 'Сброс пароля Slotwork'], ['uz', 'Slotwork parolini tiklash'], ['xx', 'Reset your Slotwork password'], [undefined, 'Reset your Slotwork password']] as const) {
      s.clock.t += 5 * 3600_000   // keep the hourly limit out of the way
      await c.post('/api/auth/forgot-password', { email, lang }); expect(lastMail(s).subject).toBe(subject)
    }
  })
  it('limits links to 3 per account per hour, and a newer link cancels the older one', async () => {
    const { email } = await newUser(s, 'seeker', 'Limit Person'), c = s.client(), start = s.outbox.length, tokens: string[] = []
    for (let i = 0; i < 4; i++) { await c.post('/api/auth/forgot-password', { email }); if (s.outbox.length > start + tokens.length) tokens.push(tokenOf(lastMail(s).text)) }
    expect(s.outbox.length - start).toBe(3)
    expect((await c.get(`/api/auth/reset-password/check?token=${tokens[0]}`)).body.valid).toBe(false); expect((await c.get(`/api/auth/reset-password/check?token=${tokens[1]}`)).body.valid).toBe(false); expect((await c.get(`/api/auth/reset-password/check?token=${tokens[2]}`)).body.valid).toBe(true)
    s.clock.t += 61 * MIN; await c.post('/api/auth/forgot-password', { email }); expect(s.outbox.length - start).toBe(4)   // allowed again after the hour
  })
  it('a mail failure never changes the answer or crashes the server', async () => {
    s.mailer.fail = true; expect((await s.client().post('/api/auth/forgot-password', { email: SEEKER })).status).toBe(204); await new Promise(r => setTimeout(r, 50)); s.mailer.fail = false
    expect((await s.client().get('/api/auth/me')).status).toBe(200)
  })
})

describe('choosing a new password', () => {
  it('lets the link be used once; signs out every device, unlocks the account, sends a confirmation', async () => {
    const { c, email, id } = await newUser(s, 'seeker', 'Reset Person'), device = s.client(); await device.login(email, 'longenough1')
    for (let i = 0; i < 5; i++) await s.client().post('/api/auth/login', { email, password: 'wrongpass1' })   // lock the account
    expect((await s.client().post('/api/auth/login', { email, password: 'longenough1' })).status).toBe(429)
    await s.client().post('/api/auth/forgot-password', { email }); const token = tokenOf(lastMail(s).text), anon = s.client(), before = s.outbox.length
    expect((await anon.get(`/api/auth/reset-password/check?token=${token}`)).body).toEqual({ valid: true })
    const weak = await anon.post('/api/auth/reset-password', { token, password: 'short' }); expect(weak.status).toBe(400); expect(weak.body.error.message).toBe('Use at least 8 characters.')
    expect((await anon.get(`/api/auth/reset-password/check?token=${token}`)).body.valid).toBe(true)   // a rejected password doesn't burn the link
    expect((await anon.post('/api/auth/reset-password', { token, password: 'brandnew456' })).status).toBe(204)
    expect((await s.client().post('/api/auth/login', { email, password: 'brandnew456' })).status).toBe(200)       // new password works, and the lockout is gone
    expect((await s.client().post('/api/auth/login', { email, password: 'longenough1' })).status).toBe(401)
    expect((await c.get('/api/jobs')).status).toBe(401); expect((await device.get('/api/jobs')).status).toBe(401)  // every old session is dead
    expect(s.outbox.length).toBe(before + 1); expect(lastMail(s)).toMatchObject({ to: email, subject: 'Your Slotwork password was changed' }); expect(lastMail(s).text).toContain('/forgot-password')
    const again = await anon.post('/api/auth/reset-password', { token, password: 'another789a' }); expect(again.status).toBe(400); expect(again.body.error.message).toBe(INVALID)
    expect((await anon.get(`/api/auth/reset-password/check?token=${token}`)).body.valid).toBe(false)
    expect((await (await s.as(email).catch(() => s.client())).get('/api/notifications')).status).toBeLessThan(500); void id
  })
  it('rejects expired, unknown and malformed links with one message', async () => {
    const { email } = await newUser(s, 'seeker', 'Expiry Person'), anon = s.client(); await anon.post('/api/auth/forgot-password', { email }); const token = tokenOf(lastMail(s).text)
    s.clock.t += 61 * MIN; expect((await anon.get(`/api/auth/reset-password/check?token=${token}`)).body.valid).toBe(false)
    for (const t of [token, 'a'.repeat(43), 'short', '', "' OR 1=1 --"]) { const r = await anon.post('/api/auth/reset-password', { token: t, password: 'brandnew456' }); expect(r.status, t).toBe(400); expect(r.body.error.message).toBe(INVALID) }
    expect((await anon.post('/api/auth/reset-password', { password: 'brandnew456' })).status).toBe(400)
    expect((await s.client().post('/api/auth/login', { email, password: 'longenough1' })).status).toBe(200)   // the old password still works: nothing changed
  })
  it('two simultaneous uses of one link succeed exactly once', async () => {
    const { email } = await newUser(s, 'seeker', 'Race Person'), anon = s.client(); await anon.post('/api/auth/forgot-password', { email }); const token = tokenOf(lastMail(s).text)
    const res = await Promise.all([anon.post('/api/auth/reset-password', { token, password: 'firstwins123' }), s.client().post('/api/auth/reset-password', { token, password: 'secondwins456' })])
    expect(res.map(r => r.status).sort()).toEqual([204, 400])
    const winner = res[0].status === 204 ? 'firstwins123' : 'secondwins456'; expect((await s.client().post('/api/auth/login', { email, password: winner })).status).toBe(200)
  })
})

describe('mail configuration', () => {
  it('reports whether email is available so the page can say so honestly', async () => {
    expect((await s.client().get('/api/auth/config')).body).toEqual({ emailEnabled: true })
    const off = await startServer({}, { mailer: new DisabledMailer() })
    expect((await off.client().get('/api/auth/config')).body).toEqual({ emailEnabled: false }); expect((await off.client().post('/api/auth/forgot-password', { email: SEEKER })).status).toBe(204); await off.close()
  })
  it('reads SMTP settings from the environment; production without SMTP or APP_URL disables email; links never end with a double slash', () => {
    expect(mailConfig({ SMTP_URL: 'smtps://me%40x.uz:p%40ss@mail.example:465', APP_URL: 'https://jobs.example/', MAIL_FROM: 'Jobs <hi@jobs.example>' }, true))
      .toEqual({ mode: 'smtp', from: 'Jobs <hi@jobs.example>', appUrl: 'https://jobs.example', smtp: { host: 'mail.example', port: 465, secure: true, user: 'me@x.uz', pass: 'p@ss' } })
    expect(mailConfig({ SMTP_HOST: 'smtp.example', SMTP_PORT: '587', SMTP_USER: 'u', SMTP_PASS: 'p', APP_URL: 'https://a.example' }, true).smtp).toEqual({ host: 'smtp.example', port: 587, secure: false, user: 'u', pass: 'p' })
    expect(mailConfig({}, true).mode).toBe('disabled'); expect(mailConfig({ SMTP_URL: 'smtp://h:25' }, true).mode).toBe('disabled')   // production + SMTP but no APP_URL
    expect(mailConfig({}, false)).toMatchObject({ mode: 'console', appUrl: 'http://localhost:5173' }); expect(mailConfig({ SMTP_URL: 'not a url' }, false).mode).toBe('console')
  })
  it('escapes everything it puts into the HTML body', () => {
    const m = renderEmail('reset', 'en', { name: '<script>alert(1)</script>', link: 'https://a.example/x?token=a"b&c' })
    expect(m.html).not.toContain('<script>'); expect(m.html).toContain('&lt;script&gt;'); expect(m.html).toContain('token=a&quot;b&amp;c')
    for (const lang of ['en', 'ru', 'uz'] as const) for (const kind of ['reset', 'changed'] as const) { const x = renderEmail(kind, lang, { name: 'A', link: 'https://l' }); expect(x.subject.length).toBeGreaterThan(5); expect(x.text).toContain('https://l') }
  })
})
void MemoryMailer
