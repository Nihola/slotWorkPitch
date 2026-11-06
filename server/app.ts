import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import helmet from 'helmet'
import type { Config } from './config'
import { all, openDb } from './db'
import type { Ctx } from './context'
import { ApiError, errorHandler } from './http'
import { authenticate } from './auth'
import { csrfGuard, rateLimit } from './security'
import { authRoutes } from './routes/auth'
import { meRoutes } from './routes/me'
import { jobRoutes } from './routes/jobs'
import { applicationRoutes } from './routes/applications'
import { chatRoutes } from './routes/chat'
import { notificationRoutes, reportRoutes, savedRoutes } from './routes/misc'
import { adminRoutes } from './routes/admin'
import { ensureAdmin, seedDemo } from './seed'
import { createMailer, type Mailer } from './mail/mailer'
import { persistentAuthEnabled, persistentSaveUser } from './persistentAuth'
import type { UserRow } from './mappers'

export interface AppOptions { now?: () => number; mailer?: Mailer; limits?: { global: number; auth: number } }
/** Builds the whole server (API + static site). Tests call this with an in-memory database. */
export async function createApp(cfg: Config, opts: AppOptions = {}) {
  const db = openDb(cfg.dbPath), ctx: Ctx = { db, cfg, now: opts.now ?? Date.now, mailer: opts.mailer ?? createMailer(cfg.mail) }
  if (cfg.seedDemo) await seedDemo(ctx)
  await ensureAdmin(ctx)
  if (cfg.seedDemo && persistentAuthEnabled()) {
    for (const user of all<UserRow>(db, 'SELECT * FROM users WHERE email IN (?,?,?)', 'seeker@demo.test', 'employer@demo.test', 'admin@demo.test')) await persistentSaveUser(user)
  }

  const app = express()
  app.disable('x-powered-by')
  if (cfg.trustProxy) app.set('trust proxy', 1)
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null, 'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"], 'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'] } },
    strictTransportSecurity: cfg.production, crossOriginEmbedderPolicy: false,
  }))
  const api = express.Router()
  api.use(express.json({ limit: '100kb' }), csrfGuard, rateLimit(60_000, opts.limits?.global ?? 600), authenticate(ctx))
  const authLimit = rateLimit(60_000, opts.limits?.auth ?? 30)
  api.use('/auth', authRoutes(ctx, authLimit))
  api.use('/me', meRoutes(ctx))
  api.use('/', jobRoutes(ctx))
  api.use('/applications', applicationRoutes(ctx))
  api.use('/conversations', chatRoutes(ctx))
  api.use('/notifications', notificationRoutes(ctx))
  api.use('/saved', savedRoutes(ctx))
  api.use('/reports', reportRoutes(ctx))
  api.use('/admin', adminRoutes(ctx))
  api.use((_req, _res, next) => next(new ApiError(404, 'Not found.', 'not_found')))
  app.use('/api', api)
  app.use('/api', errorHandler)

  const dir = cfg.staticDir
  if (dir && fs.existsSync(path.join(dir, 'index.html'))) {
    app.use(express.static(dir, { index: false, setHeaders: (res, file) => { if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') } }))
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dir, 'index.html')) : next()))   // single-page app: deep links load index.html
  }
  app.use(errorHandler)
  return { app, db, ctx, close: () => db.close() }
}
