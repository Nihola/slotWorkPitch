import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, type AppOptions } from '../app'
import { loadConfig, type Config } from '../config'
import { MemoryMailer } from '../mail/mailer'

export interface Reply<T = any> { status: number; body: T; headers: Headers }
/** A tiny HTTP client with its own cookie jar, so each instance is one "browser". */
export class Client {
  cookies = new Map<string, string>()
  constructor(private base: string) {}
  async call(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Reply> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Requested-With': 'slotwork', ...extra }
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(this.base + path, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    for (const c of res.headers.getSetCookie()) { const [kv, ...flags] = c.split(';'), i = kv.indexOf('='), v = kv.slice(i + 1); if (v === '' || flags.some(f => f.trim() === 'Max-Age=0')) this.cookies.delete(kv.slice(0, i)); else this.cookies.set(kv.slice(0, i), v) }
    const text = await res.text()
    let parsed: any = text; try { parsed = text ? JSON.parse(text) : null } catch { /* not json */ }
    return { status: res.status, body: parsed, headers: res.headers }
  }
  get = (p: string) => this.call('GET', p); post = (p: string, b?: unknown) => this.call('POST', p, b ?? {}); put = (p: string, b: unknown) => this.call('PUT', p, b); patch = (p: string, b: unknown) => this.call('PATCH', p, b)
  async login(email: string, password = 'demo1234') { const r = await this.post('/api/auth/login', { email, password }); if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.body)}`); return r.body.session }
}
export interface TestServer { mailer: MemoryMailer; outbox: MemoryMailer['outbox']; url: string; client: () => Client; as: (email: string) => Promise<Client>; clock: { t: number }; db: import('../db').DB; close: () => Promise<void> }
export async function startServer(over: Partial<Config> = {}, opts: AppOptions = {}): Promise<TestServer> {
  const cfg: Config = { ...loadConfig({}, []), dbPath: ':memory:', port: 0, production: false, seedDemo: true, staticDir: null, ...over }
  const clock = { t: Date.now() }, mailer = new MemoryMailer()
  const { app, db, close } = await createApp(cfg, { now: () => clock.t, mailer, limits: { global: 100_000, auth: 100_000 }, ...opts })
  const server: Server = await new Promise(res => { const s = app.listen(0, '127.0.0.1', () => res(s)) })
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { mailer: (opts.mailer as MemoryMailer) ?? mailer, outbox: ((opts.mailer as MemoryMailer) ?? mailer).outbox, url, clock, db, client: () => new Client(url), as: async email => { const c = new Client(url); await c.login(email); return c },
    close: async () => { await new Promise<void>(r => server.close(() => r())); close() } }
}
export const SEEKER = 'seeker@demo.test', EMPLOYER = 'employer@demo.test', ADMIN = 'admin@demo.test'
/** A valid job body as the wizard sends it. */
export const jobBody = (over: object = {}) => ({
  title: 'Pastry assistant', category: 'Food & beverage', type: 'part-time', description: 'Help prepare pastries early in the morning at our bakery.', positions: 2, salaryMin: 250, salaryMax: 300, salaryPeriod: 'month',
  paymentFrequency: 'Weekly', workMode: 'on-site', city: 'Tashkent', district: 'Mirobod', address: 'Navoi 3', skills: ['Cooking'], languages: ['Uzbek'],
  schedule: { days: [0, 1, 2], startHour: 9, endHour: 18, flexible: false, shifts: [{ id: 's1', label: 'Morning', startHour: 9, endHour: 13 }] }, ...over,
})
export const profileBody = (over: object = {}) => ({ headline: 'Student', city: 'Tashkent', district: 'Chilonzor', skills: ['English', 'Teaching'], education: 'High school', experience: 'No experience yet', jobTypes: ['part-time'], remoteOk: false, flexible: false,
  availability: [{ dayOfWeek: 0, startHour: 15, endHour: 20, kind: 'available' }], ...over })
/** Registers a fresh account and returns its client already signed in. */
export async function newUser(s: TestServer, role: 'seeker' | 'employer', name = 'Tester', onboard = true) {
  const c = s.client(), email = `${name.toLowerCase().replace(/\W/g, '')}${Math.random().toString(36).slice(2, 6)}@test.uz`
  const r = await c.post('/api/auth/register', { name, email, password: 'longenough1', role })
  if (r.status !== 201) throw new Error(JSON.stringify(r.body))
  if (role === 'seeker' && onboard) { const p = await c.put('/api/me/profile', profileBody()); if (p.status !== 200) throw new Error(JSON.stringify(p.body)) }
  return { c, email, id: r.body.session.user.id as string }
}
