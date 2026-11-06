import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto'
import type { Request, RequestHandler, Response } from 'express'
import { ApiError } from './http.js'

// --- passwords: scrypt with a random salt per password
const N = 16384, R = 8, P = 1
const kdf = (pw: string, salt: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((res, rej) => _scrypt(pw, salt, 32, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))))
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16)
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${(await kdf(pw, salt, N, R, P)).toString('hex')}`
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const want = Buffer.from(hash, 'hex'), got = await kdf(pw, Buffer.from(salt, 'hex'), Number(n), Number(r), Number(p))
  return got.length === want.length && timingSafeEqual(got, want)
}
let dummy: string | undefined
/** Spends the same time as a real check, so an unknown email can't be told apart from a wrong password by timing. */
export async function burnVerify(pw: string) { dummy ??= await hashPassword('not-a-real-password'); await verifyPassword(pw, dummy) }

// --- session tokens: the browser holds the token, the database holds only its hash
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
export const COOKIE = 'slotwork_sid'
export function readCookie(req: Request, name: string): string | undefined {
  const h = req.headers.cookie; if (!h) return undefined
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()) } catch { return undefined } } }
}
export const setSessionCookie = (res: Response, token: string, maxAgeSec: number, secure: boolean) =>
  res.append('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`)
export const clearSessionCookie = (res: Response, secure: boolean) => setSessionCookie(res, '', 0, secure)

/** CSRF defence: state-changing requests must carry a custom header (which cross-site forms can't send) and, if an Origin is present, match our host. */
export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  if (req.get('x-requested-with') !== 'slotwork') return next(new ApiError(403, 'Blocked: missing request header.', 'csrf'))
  const origin = req.get('origin')
  if (origin) { let host = ''; try { host = new URL(origin).host } catch { /* invalid */ } if (host !== req.get('host')) return next(new ApiError(403, 'Blocked: cross-site request.', 'csrf')) }
  next()
}

/** Simple in-memory fixed-window limiter per client IP. Fine for one server process; use a shared store if you scale out. */
export function rateLimit(windowMs: number, max: number): RequestHandler {
  const hits = new Map<string, { n: number; reset: number }>()
  return (req, res, next) => {
    const now = Date.now(), key = req.ip ?? 'unknown'; let h = hits.get(key)
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k) }
    if (++h.n > max) { const s = Math.ceil((h.reset - now) / 1000); res.setHeader('Retry-After', String(s)); return next(new ApiError(429, `Too many requests. Try again in ${s} seconds.`, 'rate_limited')) }
    next()
  }
}
