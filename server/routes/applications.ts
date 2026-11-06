import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Ctx } from '../context'
import { all, get, run, tx } from '../db'
import { ApiError, bad, conflict, notFound, parse } from '../http'
import { requireAuth, requireRole } from '../auth'
import { applySchema, statusSchema } from '../schemas'
import { toApplication, toJob, type AppRow, type JobRow, type UserRow } from '../mappers'
import { notify } from '../notify'
import { FINAL, TRANSITIONS } from '../../src/utils/applicationRules'
import type { Application, ApplicationStatus, JobSeeker } from '../../src/types'

const STATUS_TEXT: Partial<Record<ApplicationStatus, (a: Application) => string>> = {
  under_review: a => `${a.company} is reviewing your application for ${a.jobTitle}.`, shortlisted: a => `Your application for ${a.jobTitle} was shortlisted.`,
  interview: a => `${a.company} invited you to an interview for ${a.jobTitle}.`, accepted: a => `Congratulations! ${a.company} accepted your application for ${a.jobTitle}.`,
  rejected: a => `${a.company} didn't move forward with your application for ${a.jobTitle}.`,
}
const isActive = (s: ApplicationStatus) => !FINAL.includes(s) || s === 'accepted'

export function applicationRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx
  r.use(requireAuth)
  const rowOf = (id: string) => get<AppRow>(db, 'SELECT * FROM applications WHERE id = ?', id)
  const save = (a: Application) => run(db, 'UPDATE applications SET status = ?, updated_at = ?, data = ? WHERE id = ?', a.status, a.updatedAt, JSON.stringify({ ...a, id: undefined, jobId: undefined, seekerId: undefined, employerId: undefined, status: undefined, createdAt: undefined, updatedAt: undefined }), a.id)

  r.post('/', requireRole('seeker'), (req, res) => {
    const b = parse(applySchema, req.body), me = get<UserRow>(db, 'SELECT * FROM users WHERE id = ?', req.user!.id)!
    const jobRow = get<JobRow>(db, "SELECT * FROM jobs WHERE id = ? AND moderation = 'approved'", b.jobId)
    if (!jobRow) throw bad('This job is no longer accepting applications.')
    if (!me.profile) throw bad('Finish your profile before applying.')
    const job = toJob(jobRow), candidate = JSON.parse(me.profile) as JobSeeker   // the candidate snapshot comes from the server, never the client
    const shift = b.shiftId ? job.schedule.shifts.find(s => s.id === b.shiftId) : undefined
    if (b.shiftId && !shift) throw bad('That shift is no longer available.')
    const dup = all<{ status: ApplicationStatus }>(db, 'SELECT status FROM applications WHERE seeker_id = ? AND job_id = ?', me.id, job.id).some(x => isActive(x.status))
    if (dup) throw conflict("You've already applied to this job.")
    const id = `app-${randomUUID().slice(0, 8)}`, conv = `c-${id}`, now = new Date(ctx.now()).toISOString(), message = b.message?.trim() || undefined
    tx(db, () => {
      run(db, 'INSERT INTO applications (id, job_id, seeker_id, employer_id, status, created_at, updated_at, data) VALUES (?,?,?,?,?,?,?,?)', id, job.id, me.id, job.employerId, 'submitted', now, now,
        JSON.stringify({ jobTitle: job.title, company: job.company, candidate, shiftId: shift?.id, shiftLabel: shift?.label, shiftStart: shift?.startHour, shiftEnd: shift?.endHour, message, history: [{ status: 'submitted', at: now }], conversationId: conv }))
      run(db, 'INSERT INTO conversations (id, application_id, job_id, job_title, company, shift_label, seeker_id, seeker_name, employer_id, last_message, last_at, unread_seeker, unread_employer) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)',
        conv, id, job.id, job.title, job.company, shift?.label ?? null, me.id, me.name, job.employerId, message ?? 'Application submitted', now, message ? 1 : 0)
      if (message) run(db, 'INSERT INTO messages (id, conversation_id, sender_id, sender_name, body, sent_at) VALUES (?,?,?,?,?,?)', randomUUID(), conv, me.id, me.name, message, now)
      notify(db, { userId: job.employerId, category: 'applications', kind: 'application.new', params: { name: me.name, job: job.title }, body: `${me.name} applied to ${job.title}.`, link: '/employer/applications' }, now)
    })
    res.status(201).json(toApplication(rowOf(id)!))
  })

  r.get('/mine', requireRole('seeker'), (req, res) => res.json(all<AppRow>(db, 'SELECT * FROM applications WHERE seeker_id = ? ORDER BY created_at DESC', req.user!.id).map(toApplication)))
  r.get('/employer', requireRole('employer'), (req, res) => res.json(all<AppRow>(db, 'SELECT * FROM applications WHERE employer_id = ? ORDER BY created_at DESC', req.user!.id).map(toApplication)))
  r.get('/active', requireRole('seeker'), (req, res) => {
    const jobId = String(req.query.jobId ?? '')
    const a = all<AppRow>(db, 'SELECT * FROM applications WHERE seeker_id = ? AND job_id = ? ORDER BY created_at DESC', req.user!.id, jobId).map(toApplication).find(x => isActive(x.status))
    res.json({ application: a ?? null })
  })
  r.get('/:id', (req, res) => {
    const row = rowOf(String(req.params.id))
    if (!row || (row.seeker_id !== req.user!.id && row.employer_id !== req.user!.id)) throw notFound('Application not found.')
    res.json(toApplication(row))
  })

  /** The job's employer moves an application forward; only valid transitions are accepted. */
  r.post('/:id/status', requireRole('employer'), (req, res) => {
    const { status, note } = parse(statusSchema, req.body), row = rowOf(String(req.params.id))
    if (!row || row.employer_id !== req.user!.id) throw notFound('Application not found.')
    const a = toApplication(row)
    if (!TRANSITIONS[a.status].includes(status)) throw new ApiError(409, `This application can't move from ${a.status.replace('_', ' ')} to ${status.replace('_', ' ')}.`, 'bad_transition')
    const at = new Date(ctx.now()).toISOString()
    a.status = status; a.updatedAt = at; a.history = [...a.history, { status, at, note: note?.trim() || undefined }]
    tx(db, () => { save(a); notify(db, { userId: a.seekerId, category: status === 'interview' ? 'interviews' : 'applications', kind: `application.${status}`, params: { company: a.company, job: a.jobTitle }, body: STATUS_TEXT[status]!(a), link: `/applications/${a.id}` }, at) })
    res.json(a)
  })

  r.post('/:id/withdraw', requireRole('seeker'), (req, res) => {
    const row = rowOf(String(req.params.id))
    if (!row || row.seeker_id !== req.user!.id) throw notFound('Application not found.')
    const a = toApplication(row)
    if (FINAL.includes(a.status)) throw conflict("This application is already closed, so it can't be withdrawn.")
    const at = new Date(ctx.now()).toISOString()
    a.status = 'withdrawn'; a.updatedAt = at; a.history = [...a.history, { status: 'withdrawn', at }]
    tx(db, () => { save(a); notify(db, { userId: a.employerId, category: 'applications', kind: 'application.withdrawn', params: { name: a.candidate.name, job: a.jobTitle }, body: `${a.candidate.name} withdrew their application for ${a.jobTitle}.`, link: '/employer/applications' }, at) })
    res.json(a)
  })
  return r
}
