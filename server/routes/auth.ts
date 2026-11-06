import { randomUUID } from 'node:crypto'
import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import type { Ctx } from '../context'
import { get, run, tx } from '../db'
import { ApiError, conflict, parse } from '../http'
import { burnVerify, hashPassword, newToken, sha256, verifyPassword } from '../security'
import { renderEmail, type MailLang } from '../mail/templates'
import { dropSession, endSession, LOCK_MS, MAX_FAILS, requireAuth, startSession, WINDOW_MS } from '../auth'
import { loginSchema, registerSchema, emailSchema, passwordSchema } from '../schemas'
import { toSession, type UserRow } from '../mappers'
import { notify } from '../notify'

const BAD_LOGIN = 'Email or password is incorrect.'
export const RESET_TTL_MS = 60 * 60_000, MAX_RESETS_PER_HOUR = 3
export const sessionOf = (ctx: Ctx, id: string) => toSession(get<UserRow>(ctx.db, 'SELECT * FROM users WHERE id = ?', id)!)

export function authRoutes(ctx: Ctx, limiter: RequestHandler) {
  const r = Router(), { db } = ctx
  r.get('/me', (req, res) => res.json({ session: req.user ? sessionOf(ctx, req.user.id) : null }))

  r.post('/register', limiter, async (req, res) => {
    const b = parse(registerSchema, req.body)
    if (get(db, 'SELECT 1 FROM users WHERE email = ?', b.email)) throw conflict('An account with this email already exists.')
    const id = randomUUID()
    run(db, 'INSERT INTO users (id, email, name, role, pw_hash, onboarded, created_at) VALUES (?,?,?,?,?,?,?)', id, b.email, b.name, b.role, await hashPassword(b.password), b.role === 'seeker' ? 0 : 1, new Date(ctx.now()).toISOString())
    notify(db, b.role === 'seeker'
      ? { userId: id, category: 'system', kind: 'system.welcome.seeker', body: 'Welcome to Slotwork! Finish your profile so we can match you with jobs that fit your schedule.', link: '/onboarding' }
      : { userId: id, category: 'system', kind: 'system.welcome.employer', body: 'Welcome to Slotwork! Post your first job to start receiving applications.', link: '/employer/jobs/new' })
    dropSession(ctx, req); startSession(ctx, res, id)
    res.status(201).json({ session: sessionOf(ctx, id) })
  })

  r.post('/login', limiter, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body), now = ctx.now()
    const att = get<{ fails: number; first_at: number; locked_until: number }>(db, 'SELECT * FROM login_attempts WHERE email = ?', email)
    if (att && att.locked_until > now) { const m = Math.ceil((att.locked_until - now) / 60_000); throw new ApiError(429, `Too many failed attempts. Try again in ${m} minute${m === 1 ? '' : 's'}.`, 'locked') }
    const u = get<UserRow>(db, 'SELECT * FROM users WHERE email = ?', email)
    const okPw = u ? await verifyPassword(password, u.pw_hash) : (await burnVerify(password), false)   // unknown emails cost the same time
    if (!u || !okPw) {
      const fresh = !att || now - att.first_at > WINDOW_MS, fails = fresh ? 1 : att.fails + 1
      run(db, 'INSERT INTO login_attempts (email, fails, first_at, locked_until) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET fails = excluded.fails, first_at = excluded.first_at, locked_until = excluded.locked_until',
        email, fails, fresh ? now : att.first_at, fails >= MAX_FAILS ? now + LOCK_MS : 0)
      throw new ApiError(401, BAD_LOGIN, 'bad_credentials')
    }
    run(db, 'DELETE FROM login_attempts WHERE email = ?', email)
    dropSession(ctx, req); startSession(ctx, res, u.id)   // fresh token on every login (no session fixation)
    res.json({ session: toSession(u) })
  })

  r.post('/logout', (req, res) => { endSession(ctx, req, res); res.status(204).end() })

  /** Mail is sent in the background and failures are only logged, so the response never reveals whether an account exists or whether delivery worked. */
  const sendMail = (to: string, content: { subject: string; text: string; html: string }) => { ctx.mailer.send({ to, ...content }).catch(e => console.error(`Email to ${to} failed: ${(e as Error).message}`)) }
  const langSchema = z.enum(['en', 'ru', 'uz']).catch('en')
  const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.'
  const linkState = (token: string) => get<{ user_id: string; expires_at: number; used: number }>(db, 'SELECT user_id, expires_at, used FROM password_resets WHERE token_hash = ?', sha256(token))
  const isLive = (row: ReturnType<typeof linkState>) => !!row && !row.used && row.expires_at > ctx.now()

  r.get('/config', (_req, res) => res.json({ emailEnabled: ctx.mailer.enabled }))

  /**
   * Always answers 204, whether or not the email has an account (no account discovery). At most 3 links per account per hour;
   * a new link cancels the previous one. The link's host comes from APP_URL, never from the request.
   */
  r.post('/forgot-password', limiter, (req, res) => {
    const { email, lang } = parse(z.object({ email: emailSchema, lang: langSchema }), req.body), now = ctx.now()
    const u = get<UserRow>(db, 'SELECT * FROM users WHERE email = ?', email)
    if (!ctx.mailer.enabled) console.warn('Password reset requested but email is not configured.')
    else if (u) {
      run(db, 'DELETE FROM password_resets WHERE created_at < ?', now - 24 * 3600_000)
      if (get<{ c: number }>(db, 'SELECT COUNT(*) c FROM password_resets WHERE user_id = ? AND created_at > ?', u.id, now - 3600_000)!.c < MAX_RESETS_PER_HOUR) {
        const token = newToken()
        tx(db, () => {
          run(db, 'UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', u.id)   // the newest link wins
          run(db, 'INSERT INTO password_resets (token_hash, user_id, expires_at, used, created_at) VALUES (?,?,?,0,?)', sha256(token), u.id, now + RESET_TTL_MS, now)   // only the token's hash is stored
        })
        sendMail(u.email, renderEmail('reset', lang as MailLang, { name: u.name, link: `${ctx.cfg.mail.appUrl}/reset-password?token=${encodeURIComponent(token)}`, minutes: RESET_TTL_MS / 60_000 }))
      }
    }
    res.status(204).end()
  })

  /** Lets the page say "this link has expired" before the person types a new password. */
  r.get('/reset-password/check', limiter, (req, res) => { const t = String(req.query.token ?? ''); res.json({ valid: t.length >= 20 && t.length <= 200 && isLive(linkState(t)) }) })

  r.post('/reset-password', limiter, async (req, res) => {
    const { token, password, lang } = parse(z.object({ token: z.string().max(200), password: passwordSchema, lang: langSchema }), req.body)
    const hash = await hashPassword(password)   // slow work first, then check-and-consume the token atomically below
    const done = tx(db, () => {
      const row = linkState(token)
      if (!isLive(row) || run(db, 'UPDATE password_resets SET used = 1 WHERE token_hash = ? AND used = 0', sha256(token)).changes !== 1) return null
      const u = get<UserRow>(db, 'SELECT * FROM users WHERE id = ?', row!.user_id)!
      run(db, 'UPDATE users SET pw_hash = ? WHERE id = ?', hash, u.id)
      run(db, 'UPDATE password_resets SET used = 1 WHERE user_id = ?', u.id)       // every other link for this account dies too
      run(db, 'DELETE FROM sessions WHERE user_id = ?', u.id)                      // signed out everywhere
      run(db, 'DELETE FROM login_attempts WHERE email = ?', u.email)               // a locked account is unlocked by proving email ownership
      notify(db, { userId: u.id, category: 'system', kind: 'system.password_changed', body: 'Your password was changed. If this was not you, reset it again.', link: '/forgot-password' }, new Date(ctx.now()).toISOString())
      return u
    })
    if (!done) throw new ApiError(400, INVALID_LINK, 'invalid_token')
    sendMail(done.email, renderEmail('changed', lang as MailLang, { name: done.name, link: `${ctx.cfg.mail.appUrl}/forgot-password` }))
    res.status(204).end()
  })
  void requireAuth
  return r
}
