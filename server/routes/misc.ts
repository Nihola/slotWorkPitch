import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Ctx } from '../context'
import { all, get, run } from '../db.js'
import { conflict, notFound, parse } from '../http.js'
import { requireAuth, requireRole } from '../auth.js'
import { reportSchema } from '../schemas.js'
import { toNotification, type NotifRow } from '../mappers.js'

export function notificationRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx; r.use(requireAuth)
  r.get('/', (req, res) => res.json(all<NotifRow>(db, 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200', req.user!.id).map(toNotification)))
  r.post('/read-all', (req, res) => { run(db, 'UPDATE notifications SET read = 1 WHERE user_id = ?', req.user!.id); res.status(204).end() })
  r.post('/:id/read', (req, res) => { run(db, 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', String(req.params.id), req.user!.id); res.status(204).end() })
  return r
}
export function savedRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx; r.use(requireRole('seeker'))
  const ids = (uid: string) => all<{ job_id: string }>(db, 'SELECT job_id FROM saved WHERE user_id = ? ORDER BY rowid', uid).map(x => x.job_id)
  r.get('/', (req, res) => res.json(ids(req.user!.id)))
  r.post('/:jobId/toggle', (req, res) => {
    const uid = req.user!.id, jobId = String(req.params.jobId), had = !!get(db, 'SELECT 1 FROM saved WHERE user_id = ? AND job_id = ?', uid, jobId)
    if (had) run(db, 'DELETE FROM saved WHERE user_id = ? AND job_id = ?', uid, jobId)
    else { if (!get(db, "SELECT 1 FROM jobs WHERE id = ? AND moderation = 'approved'", jobId)) throw notFound('Job not found.'); run(db, 'INSERT INTO saved (user_id, job_id) VALUES (?,?)', uid, jobId) }
    res.json({ saved: !had, ids: ids(uid) })
  })
  return r
}
export function reportRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx; r.use(requireAuth)
  r.post('/', (req, res) => {
    const b = parse(reportSchema, req.body), uid = req.user!.id
    if (!get(db, 'SELECT 1 FROM jobs WHERE id = ?', b.targetId)) throw notFound('Job not found.')
    if (get(db, "SELECT 1 FROM reports WHERE reporter_id = ? AND target_id = ? AND status = 'open'", uid, b.targetId)) throw conflict("You've already reported this job. Our team is looking at it.")
    const id = randomUUID(), at = new Date(ctx.now()).toISOString()
    run(db, "INSERT INTO reports (id, target_id, reason, details, reporter_id, status, created_at) VALUES (?,?,?,?,?, 'open', ?)", id, b.targetId, b.reason, b.details?.trim() || null, uid, at)
    res.status(201).json({ id, targetType: 'job', targetId: b.targetId, reason: b.reason, details: b.details?.trim() || undefined, reporterId: uid, createdAt: at, status: 'open' })
  })
  return r
}
