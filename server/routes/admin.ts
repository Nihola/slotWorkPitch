import { Router } from 'express'
import { z } from 'zod'
import type { Ctx } from '../context'
import { all, get, run, tx } from '../db.js'
import { bad, conflict, notFound, parse } from '../http.js'
import { requireRole } from '../auth.js'
import { decisionSchema } from '../schemas.js'
import { toJob, toLog, toReport, toUser, type JobRow, type LogRow, type ReportRow, type UserRow } from '../mappers.js'
import { notify } from '../notify.js'
import { computeRisk, type Risk } from '../../src/utils/risk.js'
import type { Job, ModerationEntry, User } from '../../src/types'
import { addLog } from './moderationLog.js'

export const MIN_REASON = 10
export function adminRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx; r.use(requireRole('admin'))
  const jobs = () => all<JobRow>(db, 'SELECT * FROM jobs ORDER BY rowid').map(toJob)
  const log = () => all<LogRow>(db, 'SELECT * FROM moderation_log ORDER BY seq').map(toLog)
  const reportsFor = (id: string) => all<ReportRow>(db, 'SELECT * FROM reports WHERE target_id = ? ORDER BY created_at DESC', id).map(toReport)
  function riskOf(job: Job, list: Job[], entries: ModerationEntry[]): Risk {
    const others = new Set(list.filter(j => j.employerId === job.employerId && j.id !== job.id).map(j => j.id))
    return computeRisk(job, { openReports: reportsFor(job.id).filter(x => x.status === 'open').length, priorRejections: entries.filter(e => e.action === 'reject' && others.has(e.jobId)).length })
  }

  r.get('/jobs', (_req, res) => res.json(jobs()))
  r.get('/queue', (_req, res) => {
    const list = jobs(), entries = log()
    res.json(list.filter(j => j.moderation === 'pending').map(job => ({ job, risk: riskOf(job, list, entries) })).sort((a, b) => b.risk.score - a.risk.score || b.job.postedAt.localeCompare(a.job.postedAt)))
  })
  r.get('/reviewed', (_req, res) => res.json(log().filter(e => e.action !== 'resubmit').reverse()))
  r.get('/review/:id', (req, res) => {
    const list = jobs(), job = list.find(j => j.id === req.params.id)
    if (!job) throw notFound('We couldn\'t find that job.')
    const entries = log(), employerJobs = list.filter(j => j.employerId === job.employerId), ids = new Set(employerJobs.map(j => j.id))
    res.json({ job, risk: riskOf(job, list, entries), reports: reportsFor(job.id), employerJobs, employerLog: entries.filter(e => ids.has(e.jobId)).reverse(), jobLog: entries.filter(e => e.jobId === job.id).reverse() })
  })

  /** Shared by the three decisions. Only a pending job can be decided, and every decision is logged and tells the employer. */
  function decide(kind: 'approve' | 'reject' | 'request_changes') {
    return (req: import('express').Request, res: import('express').Response) => {
      const id = String(req.params.id), admin = req.user as User
      const body = kind === 'approve' ? { ...z.object({ acknowledgedRisk: z.boolean().optional() }).parse(req.body ?? {}), reason: '' } : parse(decisionSchema, req.body ?? {})
      const reason = body.reason.trim()
      if (kind !== 'approve' && reason.length < MIN_REASON) throw bad(kind === 'reject' ? `Add a reason of at least ${MIN_REASON} characters so the employer knows why.` : `Describe what to change in at least ${MIN_REASON} characters.`)
      const list = jobs(), job = list.find(j => j.id === id)
      if (!job) throw notFound('We couldn\'t find that job.')
      if (job.moderation !== 'pending') throw conflict('This job has already been reviewed.')
      if (kind === 'approve' && riskOf(job, list, log()).level === 'high' && !(body as { acknowledgedRisk?: boolean }).acknowledgedRisk) throw bad('Confirm that you reviewed the risk signals before approving a high-risk job.')
      const status = kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : 'changes_requested', at = new Date(ctx.now()).toISOString()
      tx(db, () => {
        run(db, 'UPDATE jobs SET moderation = ?, moderation_note = ? WHERE id = ?', status, kind === 'approve' ? null : reason, id)
        addLog(db, { jobId: id, jobTitle: job.title, action: kind, reason: kind === 'approve' ? undefined : reason, actorId: admin.id, actorName: admin.name }, at)
        notify(db, kind === 'approve' ? { userId: job.employerId, category: 'jobs', kind: 'job.approved', params: { job: job.title }, body: `Your job “${job.title}” is now live.`, link: '/employer/jobs' }
          : kind === 'reject' ? { userId: job.employerId, category: 'jobs', kind: 'job.rejected', params: { job: job.title, reason }, body: `Your job “${job.title}” was rejected: ${reason}`, link: '/employer/jobs' }
          : { userId: job.employerId, category: 'jobs', kind: 'job.changes', params: { job: job.title, reason }, body: `Changes requested for “${job.title}”: ${reason}`, link: '/employer/jobs' }, at)
      })
      res.status(204).end()
    }
  }
  r.post('/jobs/:id/approve', decide('approve')); r.post('/jobs/:id/reject', decide('reject')); r.post('/jobs/:id/request-changes', decide('request_changes'))

  r.get('/users', (_req, res) => res.json(all<UserRow>(db, 'SELECT * FROM users ORDER BY created_at, rowid').map(u => ({ ...toUser(u), onboarded: !!u.onboarded }))))
  r.get('/reports', (_req, res) => res.json(all<ReportRow>(db, 'SELECT * FROM reports ORDER BY created_at DESC').map(toReport)))
  r.patch('/reports/:id', (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['resolved', 'dismissed']) }), req.body)
    if (!get(db, 'SELECT 1 FROM reports WHERE id = ?', String(req.params.id))) throw notFound('That report no longer exists.')
    run(db, 'UPDATE reports SET status = ? WHERE id = ?', status, String(req.params.id)); res.status(204).end()
  })
  return r
}
