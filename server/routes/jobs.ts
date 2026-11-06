import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Ctx } from '../context'
import { all, get, run, tx } from '../db.js'
import { ApiError, conflict, notFound, parse } from '../http.js'
import { requireAuth, requireRole } from '../auth.js'
import { jobSchema } from '../schemas.js'
import { toJob, type JobRow, type UserRow } from '../mappers.js'
import type { CompanyProfile } from '../../src/types'
import { addLog } from './moderationLog.js'

export const jobData = (j: Record<string, unknown>) => { const { id, employerId, moderation, moderationNote, postedAt, ...rest } = j; void id; void employerId; void moderation; void moderationNote; void postedAt; return JSON.stringify(rest) }

export function jobRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx
  // seekers and employers browse live jobs only
  r.get('/jobs', requireAuth, (_req, res) => res.json(all<JobRow>(db, "SELECT * FROM jobs WHERE moderation = 'approved' ORDER BY rowid").map(toJob)))
  r.get('/jobs/:id', requireAuth, (req, res) => {
    const row = get<JobRow>(db, "SELECT * FROM jobs WHERE id = ? AND moderation = 'approved'", String(req.params.id))
    if (!row) throw notFound('Job not found.')
    res.json(toJob(row))
  })

  const emp = Router(); emp.use(requireRole('employer'))
  emp.get('/jobs', (req, res) => res.json(all<JobRow>(db, 'SELECT * FROM jobs WHERE employer_id = ? ORDER BY posted_at DESC, rowid DESC', req.user!.id).map(toJob)))
  emp.post('/jobs', (req, res) => {
    const input = parse(jobSchema, req.body), u = get<UserRow>(db, 'SELECT * FROM users WHERE id = ?', req.user!.id)!
    const company = u.company ? (JSON.parse(u.company) as CompanyProfile).name : u.name
    const id = `j-${randomUUID().slice(0, 8)}`, now = new Date(ctx.now()).toISOString()
    run(db, "INSERT INTO jobs (id, employer_id, moderation, posted_at, data) VALUES (?,?, 'pending', ?, ?)", id, u.id, now.slice(0, 10), jobData({ ...input, company, verification: 'unverified' }))
    res.status(201).json(toJob(get<JobRow>(db, 'SELECT * FROM jobs WHERE id = ?', id)!))
  })
  /** An employer edits a returned (changes requested / rejected) job and resubmits it. */
  emp.put('/jobs/:id', (req, res) => {
    const id = String(req.params.id), row = get<JobRow>(db, 'SELECT * FROM jobs WHERE id = ? AND employer_id = ?', id, req.user!.id)
    if (!row) throw notFound('Job not found.')
    if (row.moderation === 'pending' || row.moderation === 'approved') throw conflict('This job cannot be edited right now.')
    const input = parse(jobSchema, req.body), old = JSON.parse(row.data) as { company: string; verification: string }
    tx(db, () => {
      run(db, "UPDATE jobs SET moderation = 'pending', moderation_note = NULL, data = ? WHERE id = ?", jobData({ ...input, company: old.company, verification: old.verification }), id)
      addLog(db, { jobId: id, jobTitle: input.title, action: 'resubmit', actorId: req.user!.id, actorName: old.company }, new Date(ctx.now()).toISOString())
    })
    res.json(toJob(get<JobRow>(db, 'SELECT * FROM jobs WHERE id = ?', id)!))
  })
  r.use('/employer', emp)
  void ApiError
  return r
}
