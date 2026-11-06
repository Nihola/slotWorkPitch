import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { get, run } from './db'
import type { Ctx } from './context'
import { ApiError } from './http'
import { clearSessionCookie, COOKIE, newToken, readCookie, setSessionCookie, sha256 } from './security'
import type { UserRow } from './mappers'
import { toUser } from './mappers'
import type { Role } from '../src/types'

export const SESSION_MS = 7 * 24 * 3600_000
export const MAX_FAILS = 5, WINDOW_MS = 15 * 60_000, LOCK_MS = 15 * 60_000

export function startSession(ctx: Ctx, res: Response, userId: string) {
  const token = newToken(), now = ctx.now()
  run(ctx.db, 'DELETE FROM sessions WHERE expires_at < ?', now)
  run(ctx.db, 'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)', sha256(token), userId, now + SESSION_MS, now)
  setSessionCookie(res, token, SESSION_MS / 1000, ctx.cfg.production)
}
/** Forgets the session in the database only (used when a new one is about to replace it). */
export function dropSession(ctx: Ctx, req: Request) { const t = readCookie(req, COOKIE); if (t) run(ctx.db, 'DELETE FROM sessions WHERE id = ?', sha256(t)) }
export function endSession(ctx: Ctx, req: Request, res: Response) {
  const t = readCookie(req, COOKIE); if (t) run(ctx.db, 'DELETE FROM sessions WHERE id = ?', sha256(t))
  clearSessionCookie(res, ctx.cfg.production)
}
/** Attaches req.user when the session cookie is valid and unexpired. */
export const authenticate = (ctx: Ctx): RequestHandler => (req, _res, next) => {
  const t = readCookie(req, COOKIE)
  if (t) {
    const row = get<UserRow & { expires_at: number }>(ctx.db, 'SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?', sha256(t))
    if (row && row.expires_at > ctx.now()) req.user = toUser(row)
    else if (row) run(ctx.db, 'DELETE FROM sessions WHERE id = ?', sha256(t))
  }
  next()
}
export const requireAuth: RequestHandler = (req, _res, next) => (req.user ? next() : next(new ApiError(401, 'Please sign in to continue.', 'unauthenticated')))
export const requireRole = (...roles: Role[]): RequestHandler => (req: Request, _res: Response, next: NextFunction) =>
  !req.user ? next(new ApiError(401, 'Please sign in to continue.', 'unauthenticated')) : roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have access to that.', 'forbidden'))
