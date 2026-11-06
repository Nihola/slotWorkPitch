// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { all } from '../db'
import { ADMIN, EMPLOYER, SEEKER, startServer, newUser, type TestServer } from './helpers'

const DAY = 24 * 3600_000, MIN = 60_000
let s: TestServer
beforeAll(async () => { s = await startServer() })
afterAll(async () => { await s.close() })

describe('sign in and registration', () => {
  it('signs in demo accounts (email case-insensitive) and never leaks credentials', async () => {
    const c = s.client(), r = await c.post('/api/auth/login', { email: ' Seeker@Demo.TEST ', password: 'demo1234' })
    expect(r.status).toBe(200); expect(r.body.session.user.role).toBe('seeker'); expect(r.body.session.profile.skills).toContain('English')
    expect(JSON.stringify(r.body)).not.toMatch(/scrypt|pw_hash|password/i)
    expect((await c.get('/api/auth/me')).body.session.user.email).toBe(SEEKER)
  })
  it('wrong password and unknown email look identical; bad input is rejected with clear messages', async () => {
    const c = s.client(), a = await c.post('/api/auth/login', { email: SEEKER, password: 'wrongpass1' }), b = await c.post('/api/auth/login', { email: 'nobody@x.uz', password: 'wrongpass1' })
    expect(a.status).toBe(401); expect(b.status).toBe(401); expect(a.body).toEqual(b.body); expect(a.body.error.message).toBe('Email or password is incorrect.')
    expect((await c.post('/api/auth/login', { email: 'bad', password: 'x' })).body.error.message).toBe('Enter a valid email address.')
    expect((await c.post('/api/auth/login', { email: SEEKER, password: '' })).body.error.message).toBe('Enter your password.')
    expect((await c.post('/api/auth/login', { email: SEEKER })).status).toBe(400)
  })
  it('registration validates, blocks duplicates and admin self-signup, and ignores forged fields', async () => {
    const c = s.client(), reg = (b: object) => c.post('/api/auth/register', { name: 'Ann Lee', email: 'ann@test.uz', password: 'longenough1', role: 'seeker', ...b })
    expect((await reg({ password: 'short' })).body.error.message).toBe('Use at least 8 characters.')
    expect((await reg({ password: 'longenough' })).body.error.message).toBe('Include at least one number.')
    expect((await reg({ role: 'admin' })).body.error.message).toBe('Choose what you are looking for.')
    expect((await reg({ name: 'x' })).body.error.message).toBe('Enter your name.')
    expect((await reg({ name: 'x'.repeat(81) })).status).toBe(400)
    const ok = await reg({ id: 'a1', onboarded: true, pw_hash: 'x', profile: { skills: ['hack'] } })
    expect(ok.status).toBe(201); expect(ok.body.session.user.id).not.toBe('a1'); expect(ok.body.session.onboarded).toBe(false); expect(ok.body.session.profile).toBeNull()
    expect((await reg({ email: 'ANN@test.uz' })).status).toBe(409)
    const emp = await s.client().post('/api/auth/register', { name: 'Co', email: 'co@test.uz', password: 'longenough1', role: 'employer' })
    expect(emp.body.session.onboarded).toBe(true)
  })
  it('new accounts get a welcome notification', async () => {
    const { c } = await newUser(s, 'seeker', 'Welcome Person', false), n = (await c.get('/api/notifications')).body
    expect(n).toHaveLength(1); expect(n[0].category).toBe('system'); expect(n[0].kind).toBe('system.welcome.seeker')
  })
  it('forgot-password answers the same for known and unknown emails', async () => {
    const c = s.client(), a = await c.post('/api/auth/forgot-password', { email: SEEKER }), b = await c.post('/api/auth/forgot-password', { email: 'ghost@x.uz' })
    expect(a.status).toBe(204); expect(b.status).toBe(204); expect((await c.post('/api/auth/forgot-password', { email: 'nope' })).status).toBe(400)
  })
})

describe('sessions', () => {
  it('cookie is HttpOnly + SameSite=Lax, and logout kills the session server-side', async () => {
    const c = s.client(), r = await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' }), raw = r.headers.getSetCookie()
    expect(raw).toHaveLength(1); expect(raw[0]).toMatch(/HttpOnly/); expect(raw[0]).toMatch(/SameSite=Lax/); expect(raw[0]).not.toMatch(/Secure/)
    const token = c.cookies.get('slotwork_sid')!, thief = s.client(); thief.cookies.set('slotwork_sid', token)
    expect((await thief.get('/api/jobs')).status).toBe(200)
    expect((await c.post('/api/auth/logout')).status).toBe(204)
    expect((await thief.get('/api/jobs')).status).toBe(401)   // replaying the old cookie no longer works
    expect((await thief.get('/api/auth/me')).body.session).toBeNull()
  })
  it('every login issues a fresh token (no session fixation)', async () => {
    const c = s.client(); await c.login(SEEKER); const first = c.cookies.get('slotwork_sid')!
    await c.login(SEEKER); expect(c.cookies.get('slotwork_sid')).not.toBe(first)
    const old = s.client(); old.cookies.set('slotwork_sid', first); expect((await old.get('/api/jobs')).status).toBe(401)
  })
  it('sessions expire after 7 days', async () => {
    const c = await s.as(SEEKER); expect((await c.get('/api/jobs')).status).toBe(200)
    s.clock.t += 6 * DAY; expect((await c.get('/api/jobs')).status).toBe(200)
    s.clock.t += 2 * DAY; expect((await c.get('/api/jobs')).status).toBe(401); expect((await c.get('/api/auth/me')).body.session).toBeNull()
    s.clock.t = Date.now()
  })
  it('changing the password signs out other devices, and the rules are enforced', async () => {
    const { c, email } = await newUser(s, 'seeker', 'Pw Person'), other = s.client(); await other.login(email, 'longenough1')
    expect((await c.post('/api/me/password', { current: 'wrongwrong1', next: 'brandnew456' })).body.error.message).toBe('Your current password is incorrect.')
    expect((await c.post('/api/me/password', { current: 'longenough1', next: 'short' })).body.error.message).toBe('Use at least 8 characters.')
    expect((await c.post('/api/me/password', { current: 'longenough1', next: 'longenough1' })).body.error.message).toBe('Choose a password you have not used just now.')
    expect((await c.post('/api/me/password', { current: 'longenough1', next: 'brandnew456' })).status).toBe(204)
    expect((await c.get('/api/jobs')).status).toBe(200); expect((await other.get('/api/jobs')).status).toBe(401)
    expect((await s.client().post('/api/auth/login', { email, password: 'longenough1' })).status).toBe(401)
    expect((await s.client().post('/api/auth/login', { email, password: 'brandnew456' })).status).toBe(200)
  })
})

describe('brute-force protection', () => {
  it('locks an account after 5 failures for 15 minutes, even for the right password; counts reset after the window', async () => {
    const t = await startServer(), c = t.client()
    for (let i = 0; i < 5; i++) expect((await c.post('/api/auth/login', { email: SEEKER, password: 'wrongpass1' })).status).toBe(401)
    const locked = await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' })
    expect(locked.status).toBe(429); expect(locked.body.error.message).toBe('Too many failed attempts. Try again in 15 minutes.')
    t.clock.t += 14 * MIN; expect((await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' })).status).toBe(429)
    t.clock.t += 2 * MIN; expect((await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' })).status).toBe(200)
    // failures spread over more than the 15-minute window do not add up
    for (let i = 0; i < 4; i++) await c.post('/api/auth/login', { email: EMPLOYER, password: 'wrongpass1' })
    t.clock.t += 16 * MIN
    for (let i = 0; i < 4; i++) await c.post('/api/auth/login', { email: EMPLOYER, password: 'wrongpass1' })
    expect((await c.post('/api/auth/login', { email: EMPLOYER, password: 'demo1234' })).status).toBe(200)
    // unknown emails lock the same way, so lockout can't be used to find real accounts
    for (let i = 0; i < 5; i++) await c.post('/api/auth/login', { email: 'ghost@x.uz', password: 'wrongpass1' })
    expect((await c.post('/api/auth/login', { email: 'ghost@x.uz', password: 'wrongpass1' })).body.error.message).toMatch(/^Too many failed attempts/)
    await t.close()
  })
  it('rate-limits auth endpoints per client', async () => {
    const t = await startServer({}, { limits: { global: 100_000, auth: 3 } }), c = t.client()
    for (let i = 0; i < 3; i++) await c.post('/api/auth/login', { email: 'x@x.uz', password: 'wrongpass1' })
    const r = await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' })
    expect(r.status).toBe(429); expect(r.body.error.code).toBe('rate_limited'); expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0)
    await t.close()
  })
})

describe('request hardening', () => {
  it('CSRF: state-changing requests need the custom header and a same-origin Origin', async () => {
    const c = s.client(), body = JSON.stringify({ email: SEEKER, password: 'demo1234' })
    const raw = (h: Record<string, string>) => fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body })
    expect((await raw({})).status).toBe(403)                                                                      // a plain cross-site <form> post can't set the header
    expect((await raw({ 'X-Requested-With': 'slotwork', Origin: 'https://evil.example' })).status).toBe(403)       // foreign origin
    expect((await raw({ 'X-Requested-With': 'slotwork', Origin: s.url })).status).toBe(200)                         // same origin is fine
    expect((await c.get('/api/auth/me')).status).toBe(200)                                                          // reads never need it
  })
  it('malformed, oversized and unknown requests get safe JSON errors (no stack traces)', async () => {
    const c = s.client()
    const bad = await c.call('POST', '/api/auth/login', '{not json'); expect(bad.status).toBe(400); expect(bad.body.error.message).toBe('The request body is not valid JSON.')
    const big = await c.call('POST', '/api/auth/login', JSON.stringify({ email: SEEKER, password: 'x'.repeat(200_000) })); expect(big.status).toBe(413)
    const nf = await c.get('/api/nothing-here'); expect(nf.status).toBe(404); expect(nf.body.error.code).toBe('not_found')
    for (const r of [bad, big, nf]) expect(JSON.stringify(r.body)).not.toMatch(/stack|at \w+ \(|node_modules/)
  })
  it('injection-style input is treated as plain data', async () => {
    const c = await s.as(SEEKER)
    expect((await s.client().post('/api/auth/login', { email: "' OR 1=1 --", password: 'x' })).status).toBe(400)
    expect((await c.get("/api/jobs/x'%20OR%20'1'='1")).status).toBe(404)
    expect((await c.get('/api/jobs/..%2F..%2Fetc%2Fpasswd')).status).toBe(404)
    expect((await c.post('/api/saved/' + encodeURIComponent("j1'; DROP TABLE users;--") + '/toggle')).status).toBe(404)
    expect((await s.client().login(SEEKER)).user.id).toBe('s1')   // users table still intact
  })
  it('sends security headers and hides the framework', async () => {
    const r = await fetch(s.url + '/api/auth/me')
    expect(r.headers.get('content-security-policy')).toMatch(/default-src 'self'/); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); expect(r.headers.get('x-powered-by')).toBeNull()
  })
  it('anonymous callers are refused everywhere that matters', async () => {
    const c = s.client()
    for (const p of ['/api/jobs', '/api/jobs/j1', '/api/applications/mine', '/api/conversations', '/api/notifications', '/api/me/counts', '/api/saved', '/api/admin/queue', '/api/admin/users', '/api/employer/jobs'])
      expect((await c.get(p)).status, p).toBe(401)
    for (const p of ['/api/applications', '/api/reports', '/api/admin/jobs/j8/approve']) expect((await c.post(p, {})).status, p).toBe(401)
  })
  it('passwords are stored salted and hashed, never in plain text', () => {
    const rows = all<{ pw_hash: string }>(s.db, 'SELECT pw_hash FROM users')
    expect(rows.length).toBeGreaterThan(3)
    for (const r of rows) { expect(r.pw_hash).toMatch(/^scrypt\$/); expect(r.pw_hash).not.toMatch(/demo1234|longenough1/) }
    expect(new Set(rows.map(r => r.pw_hash)).size).toBe(rows.length)   // the three demo users share a password but not a hash
    const sess = all<{ id: string }>(s.db, 'SELECT id FROM sessions'); for (const x of sess) expect(x.id).toMatch(/^[0-9a-f]{64}$/)   // only token hashes are stored
  })
})

describe('configuration', () => {
  it('production: no demo accounts, Secure cookie, HSTS, admin created from the environment (weak admin password refused)', async () => {
    const weak = await startServer({ production: true, seedDemo: false, adminEmail: 'boss@company.uz', adminPassword: 'short' })
    expect((await weak.client().post('/api/auth/login', { email: SEEKER, password: 'demo1234' })).status).toBe(401)
    expect((await weak.client().post('/api/auth/login', { email: 'boss@company.uz', password: 'short' })).status).toBe(401); await weak.close()
    const t = await startServer({ production: true, seedDemo: false, adminEmail: 'Boss@Company.uz', adminPassword: 'S3curePassw0rd' }), c = t.client()
    expect((await c.post('/api/auth/login', { email: SEEKER, password: 'demo1234' })).status).toBe(401)
    const r = await c.post('/api/auth/login', { email: 'boss@company.uz', password: 'S3curePassw0rd' })
    expect(r.status).toBe(200); expect(r.body.session.user.role).toBe('admin'); expect(r.headers.getSetCookie()[0]).toMatch(/; Secure/)
    expect((await fetch(t.url + '/api/auth/me')).headers.get('strict-transport-security')).toMatch(/max-age/)
    expect((await c.get('/api/admin/queue')).body).toEqual([])   // empty production database
    await t.close()
  })
  it('data survives a restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slotwork-')), file = path.join(dir, 'db.sqlite')
    const a = await startServer({ dbPath: file }), u = await newUser(a, 'employer', 'Persist Co'); await u.c.post('/api/employer/jobs', (await import('./helpers')).jobBody({ title: 'Survives restarts' })); await a.close()
    const b = await startServer({ dbPath: file }), c = b.client(); await c.login(u.email, 'longenough1')
    expect((await c.get('/api/employer/jobs')).body.map((j: { title: string }) => j.title)).toEqual(['Survives restarts'])
    expect((await b.client().login(SEEKER)).user.id).toBe('s1')   // seeding did not run twice
    await b.close(); fs.rmSync(dir, { recursive: true, force: true })
  })
  it('admin account is read-only to the outside world: only admins list users, and no hashes leak', async () => {
    expect((await (await s.as(SEEKER)).get('/api/admin/users')).status).toBe(403)
    const r = await (await s.as(ADMIN)).get('/api/admin/users'); expect(r.status).toBe(200)
    expect(JSON.stringify(r.body)).not.toMatch(/scrypt|pw_hash/); expect(r.body[0]).toHaveProperty('onboarded')
  })
})
