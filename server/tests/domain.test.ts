// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { all } from '../db'
import { computeRisk } from '../../src/utils/risk'
import { ADMIN, EMPLOYER, SEEKER, jobBody, newUser, profileBody, startServer, type Reply, type TestServer } from './helpers'

const err = (r: Reply, status: number, message?: string | RegExp) => { expect(r.status, JSON.stringify(r.body)).toBe(status); if (message) expect(r.body.error.message).toMatch(typeof message === 'string' ? new RegExp(`^${message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : message) }
const ids = (r: Reply) => r.body.map((j: { id: string }) => j.id).join()
let s: TestServer
beforeAll(async () => { s = await startServer() }); afterAll(async () => { await s.close() })

describe('jobs', () => {
  it('seekers and employers see only live jobs; pending jobs are hidden even by id', async () => {
    const seeker = await s.as(SEEKER), emp = await s.as(EMPLOYER)
    expect(ids(await seeker.get('/api/jobs'))).toBe('j1,j2,j3,j4,j5,j6'); expect(ids(await emp.get('/api/jobs'))).toBe('j1,j2,j3,j4,j5,j6')
    expect((await seeker.get('/api/jobs/j1')).body.title).toBe('English tutor'); err(await seeker.get('/api/jobs/j7'), 404, 'Job not found.')
  })
  it('employers see every job they own; seekers cannot use employer endpoints', async () => {
    const emp = await s.as(EMPLOYER); expect(ids(await emp.get('/api/employer/jobs'))).toMatch(/j1/)
    err(await (await s.as(SEEKER)).get('/api/employer/jobs'), 403); err(await (await s.as(SEEKER)).post('/api/employer/jobs', jobBody()), 403)
  })
  it('validates a posting with the same messages the wizard shows', async () => {
    const { c } = await newUser(s, 'employer', 'Val Co'), post = (o: object) => c.post('/api/employer/jobs', jobBody(o)), sch = (o: object) => ({ schedule: { days: [0], startHour: 9, endHour: 18, flexible: false, shifts: [], ...o } })
    err(await post({ title: 'ab' }), 400, 'Enter a job title.'); err(await post({ description: 'too short' }), 400, 'Describe the role in at least 20 characters.')
    for (const p of [0, 1.5, 501]) err(await post({ positions: p }), 400, 'Enter a whole number from 1 to 500.')
    err(await post({ salaryMin: 300, salaryMax: 200 }), 400, 'The maximum must be at least the minimum.'); err(await post({ salaryMin: 0 }), 400, 'Enter the pay amount.')
    err(await post(sch({ startHour: 12, endHour: 12 })), 400, 'The end time must be after the start time.'); err(await post(sch({ startHour: 6 })), 400, 'Jobs can be scheduled between 8:00 and 22:00.')
    err(await post(sch({ shifts: [{ id: 'a', label: 'AM', startHour: 8, endHour: 10 }] })), 400, 'A shift must fall within the working hours.'); err(await post(sch({ shifts: [{ id: 'a', label: '', startHour: 9, endHour: 12 }] })), 400, 'Name this shift.')
    err(await post({ address: '', workMode: 'on-site' }), 400, 'Add the address so candidates can judge the commute.'); expect((await post({ address: undefined, workMode: 'remote', city: 'Remote' })).status).toBe(201)
    err(await post({ skills: Array.from({ length: 13 }, (_, i) => `s${i}`) }), 400, 'Choose up to 12 skills.'); err(await post({ description: 'x'.repeat(5001) }), 400, /under 5,000/)
  })
  it('a new job starts pending, is owned and branded by the server, and ignores forged fields', async () => {
    const { c, id } = await newUser(s, 'employer', 'Pastry Co'), before = (await (await s.as(SEEKER)).get('/api/jobs')).body.length
    const r = await c.post('/api/employer/jobs', jobBody({ employerId: 'e2', moderation: 'approved', verification: 'trusted', company: 'Fake Inc', id: 'j1', moderationNote: 'x' }))
    expect(r.status).toBe(201); expect(r.body).toMatchObject({ moderation: 'pending', employerId: id, company: 'Pastry Co', verification: 'unverified' }); expect(r.body.id).not.toBe('j1')
    const seeker = await s.as(SEEKER); expect((await seeker.get('/api/jobs')).body.length).toBe(before); err(await seeker.get(`/api/jobs/${r.body.id}`), 404)
    expect((await c.get('/api/employer/jobs')).body.map((j: { id: string }) => j.id)).toEqual([r.body.id])
    expect((await (await newUser(s, 'employer', 'Other Co')).c.get('/api/employer/jobs')).body).toEqual([])
    err(await (await s.as(EMPLOYER)).put(`/api/employer/jobs/${r.body.id}`, jobBody()), 404, 'Job not found.')   // someone else's job
    err(await c.put(`/api/employer/jobs/${r.body.id}`, jobBody()), 409, 'This job cannot be edited right now.')   // still pending
  })
})

describe('moderation', () => {
  let m: TestServer
  beforeAll(async () => { m = await startServer() }); afterAll(async () => { await m.close() })
  it('only admins moderate; the queue is riskiest-first with explained signals', async () => {
    err(await (await m.as(SEEKER)).get('/api/admin/queue'), 403); err(await (await m.as(EMPLOYER)).post('/api/admin/jobs/j7/approve'), 403)
    const admin = await m.as(ADMIN), q = (await admin.get('/api/admin/queue')).body
    expect(q.map((x: any) => `${x.job.id}:${x.risk.level}`)).toEqual(['j8:high', 'j9:medium', 'j7:low'])
    expect(q[0].risk.signals).toEqual(expect.arrayContaining(['Mentions fees, deposits or guaranteed earnings', '2 open reports from users', 'Employer is not verified']))
  })
  it('enforces reasons, risk acknowledgement and one decision per job; approval publishes; everything is logged and notified', async () => {
    const admin = await m.as(ADMIN), seeker = await m.as(SEEKER)
    err(await admin.post('/api/admin/jobs/j8/reject', { reason: '  too short ' }), 400, 'Add a reason of at least 10 characters so the employer knows why.')
    err(await admin.post('/api/admin/jobs/j8/request-changes', { reason: 'abc' }), 400, 'Describe what to change in at least 10 characters.')
    err(await admin.post('/api/admin/jobs/j8/approve'), 400, 'Confirm that you reviewed the risk signals before approving a high-risk job.')
    err(await admin.post('/api/admin/jobs/nope/approve'), 404, "We couldn't find that job."); expect((await admin.get('/api/admin/queue')).body).toHaveLength(3)   // failed attempts changed nothing
    expect((await admin.post('/api/admin/jobs/j9/approve')).status).toBe(204)
    expect(ids(await seeker.get('/api/jobs'))).toBe('j1,j2,j3,j4,j5,j6,j9'); expect((await seeker.get('/api/jobs/j9')).body.moderation).toBe('approved')
    err(await admin.post('/api/admin/jobs/j9/approve'), 409, 'This job has already been reviewed.'); err(await admin.post('/api/admin/jobs/j9/reject', { reason: 'long enough reason' }), 409, 'This job has already been reviewed.')
    expect((await admin.post('/api/admin/jobs/j8/reject', { reason: 'Asks candidates to pay a fee, which is not allowed.' })).status).toBe(204)
    expect((await admin.post('/api/admin/jobs/j7/request-changes', { reason: 'Please add the opening hours.' })).status).toBe(204)
    err(await seeker.get('/api/jobs/j8'), 404); expect((await admin.get('/api/admin/queue')).body).toHaveLength(0)
    const reviewed = (await admin.get('/api/admin/reviewed')).body
    expect(reviewed.map((e: any) => e.action)).toEqual(['request_changes', 'reject', 'approve']); expect(reviewed[1]).toMatchObject({ reason: 'Asks candidates to pay a fee, which is not allowed.', actorName: 'Platform Admin' })
    const notes = all<{ user_id: string; body: string; kind: string }>(m.db, "SELECT user_id, body, kind FROM notifications WHERE kind IN ('job.approved','job.rejected','job.changes') ORDER BY created_at, rowid")
    expect(notes.map(n => `${n.user_id}:${n.kind}`)).toEqual(['e9:job.approved', 'e8:job.rejected', 'e7:job.changes']); expect(notes[0].body).toBe('Your job “Delivery helper” is now live.')
    const rev = (await admin.get('/api/admin/review/j8')).body; expect(rev.reports).toHaveLength(2); expect(rev.jobLog).toHaveLength(1); expect(rev.job.moderationNote).toMatch(/pay a fee/); err(await admin.get('/api/admin/review/zzz'), 404)
  })
  it('request changes -> employer edits and resubmits -> pending again; resubmissions are logged but are not decisions; prior rejections raise risk', async () => {
    const { c, id } = await newUser(m, 'employer', 'Loop Co'), admin = await m.as(ADMIN)
    const job = (await c.post('/api/employer/jobs', jobBody({ title: 'Loop job' }))).body
    expect((await admin.get('/api/admin/queue')).body.find((x: any) => x.job.id === job.id).risk.level).toBe('medium')
    await admin.post(`/api/admin/jobs/${job.id}/request-changes`, { reason: 'Add the shift hours and the exact address.' })
    const mine = (await c.get('/api/employer/jobs')).body[0]; expect(mine).toMatchObject({ moderation: 'changes_requested', moderationNote: 'Add the shift hours and the exact address.' })
    expect((await c.get('/api/notifications')).body.find((n: any) => n.kind === 'job.changes').body).toMatch(/Add the shift hours/)
    const re = await c.put(`/api/employer/jobs/${job.id}`, jobBody({ title: 'Loop job v2', description: 'Help prepare pastries early in the morning. Shifts run 8:00 to 12:00.' }))
    expect(re.status).toBe(200); expect(re.body).toMatchObject({ moderation: 'pending', title: 'Loop job v2', postedAt: job.postedAt, company: 'Loop Co' }); expect(re.body.moderationNote).toBeUndefined()
    expect((await admin.get(`/api/admin/review/${job.id}`)).body.jobLog.map((e: any) => e.action)).toEqual(['resubmit', 'request_changes'])
    expect((await admin.get('/api/admin/reviewed')).body[0].action).not.toBe('resubmit')
    await admin.post(`/api/admin/jobs/${job.id}/reject`, { reason: 'Duplicate of a listing we already removed.' })
    expect((await c.put(`/api/employer/jobs/${job.id}`, jobBody())).status).toBe(200)   // rejected jobs can be fixed and resubmitted too
    const second = (await c.post('/api/employer/jobs', jobBody({ title: 'Second job' }))).body, risk = (await admin.get(`/api/admin/review/${second.id}`)).body.risk
    expect(risk.signals).toContain('1 earlier job from this employer rejected'); expect(risk.score).toBe(30); void id
  })
  it('the risk model flags what it should and nothing it should not', () => {
    const job: any = { title: 'Barista', description: 'Training is provided. Apply in the app. Pay is weekly and fair for the hours.', verification: 'business', salaryMax: 300, salaryPeriod: 'month', workMode: 'on-site', address: 'Navoi 3' }
    const none = { openReports: 0, priorRejections: 0 }
    expect(computeRisk(job, none)).toMatchObject({ level: 'low', score: 0, mitigations: ['Business verified'] })
    expect(computeRisk({ ...job, description: 'Contact us on Telegram @x. A registration fee of $50 applies.' }, none).signals).toEqual(expect.arrayContaining(['Asks candidates to contact outside the platform', 'Mentions fees, deposits or guaranteed earnings']))
    expect(computeRisk({ ...job, verification: 'trusted' }, none).score).toBe(0)
  })
})

describe('applications and hiring', () => {
  it('only seekers with a finished profile can apply to live jobs; the candidate is taken from the server, never the request', async () => {
    const fresh = await newUser(s, 'seeker', 'No Profile', false), seeker = await newUser(s, 'seeker', 'Aziz Rakhimov')
    err(await fresh.c.post('/api/applications', { jobId: 'j1' }), 400, 'Finish your profile before applying.'); err(await (await s.as(EMPLOYER)).post('/api/applications', { jobId: 'j1' }), 403)
    err(await seeker.c.post('/api/applications', { jobId: 'j7' }), 400, 'This job is no longer accepting applications.'); err(await seeker.c.post('/api/applications', { jobId: 'j1', shiftId: 'zzz' }), 400, 'That shift is no longer available.')
    err(await seeker.c.post('/api/applications', { jobId: 'j1', message: 'x'.repeat(1001) }), 400, 'Keep your message under 1,000 characters.')
    const r = await seeker.c.post('/api/applications', { jobId: 'j1', shiftId: 'sh3', message: '  I can start Monday.  ', candidate: { name: 'FAKE', skills: ['everything'] }, employerId: 'someone', status: 'accepted', seekerId: 's1' })
    expect(r.status).toBe(201); expect(r.body).toMatchObject({ status: 'submitted', seekerId: seeker.id, employerId: 'e2', shiftLabel: 'Early evening', shiftStart: 15, shiftEnd: 18, message: 'I can start Monday.', jobTitle: 'English tutor', company: 'Bright Academy' })
    expect(r.body.candidate.name).toBe('Aziz Rakhimov'); expect(r.body.candidate.skills).toEqual(['English', 'Teaching']); expect(r.body.history).toHaveLength(1)
    err(await seeker.c.post('/api/applications', { jobId: 'j1' }), 409, "You've already applied to this job.")
    const emp = await s.as(EMPLOYER); expect((await emp.get('/api/applications/employer')).body.some((a: any) => a.id === r.body.id)).toBe(true)
    expect((await emp.get('/api/notifications')).body[0]).toMatchObject({ kind: 'application.new', body: 'Aziz Rakhimov applied to English tutor.' })
    const conv = (await emp.get('/api/conversations')).body.find((c: any) => c.id === r.body.conversationId); expect(conv.unread.e2).toBe(1)
    expect((await seeker.c.get(`/api/applications/active?jobId=j1`)).body.application.id).toBe(r.body.id); expect((await seeker.c.get(`/api/applications/active?jobId=j2`)).body.application).toBeNull()
  })
  it('drives the hiring workflow with valid transitions only, notifying the candidate at each step', async () => {
    const a = await newUser(s, 'seeker', 'Flow Person'), emp = await s.as(EMPLOYER), other = await newUser(s, 'employer', 'Other Employer')
    const app = (await a.c.post('/api/applications', { jobId: 'j5' })).body, url = `/api/applications/${app.id}/status`
    err(await other.c.post(url, { status: 'under_review' }), 404, 'Application not found.'); err(await a.c.post(url, { status: 'accepted' }), 403)
    err(await emp.post(url, { status: 'accepted' }), 409, "This application can't move from submitted to accepted."); err(await emp.post(url, { status: 'submitted' }), 400)
    for (const st of ['under_review', 'shortlisted']) expect((await emp.post(url, { status: st })).status).toBe(200)
    const iv = await emp.post(url, { status: 'interview', note: '  Tuesday 10:00  ' }); expect(iv.body.history.map((h: any) => h.status)).toEqual(['submitted', 'under_review', 'shortlisted', 'interview']); expect(iv.body.history[3].note).toBe('Tuesday 10:00')
    expect((await emp.post(url, { status: 'accepted' })).body.status).toBe('accepted')
    const n = (await a.c.get('/api/notifications')).body; expect(n.filter((x: any) => x.category === 'applications').length).toBe(3 + 0); expect(n.filter((x: any) => x.category === 'interviews')).toHaveLength(1)
    expect(n.find((x: any) => x.kind === 'application.interview').link).toBe(`/applications/${app.id}`)
    err(await emp.post(url, { status: 'rejected' }), 409, /can't move from accepted/); err(await a.c.post(`/api/applications/${app.id}/withdraw`), 409, "This application is already closed, so it can't be withdrawn.")
    err(await a.c.post('/api/applications', { jobId: 'j5' }), 409, "You've already applied to this job.")   // an accepted application still counts
  })
  it('rejected and withdrawn applicants may apply again; withdrawing tells the employer', async () => {
    const a = await newUser(s, 'seeker', 'Retry Person'), emp = await s.as(EMPLOYER), b = await newUser(s, 'seeker', 'Other Seeker')
    const first = (await a.c.post('/api/applications', { jobId: 'j6' })).body; await emp.post(`/api/applications/${first.id}/status`, { status: 'rejected', note: 'Not this time.' })
    const second = (await a.c.post('/api/applications', { jobId: 'j6' })).body; expect(second.id).not.toBe(first.id)
    err(await b.c.post(`/api/applications/${second.id}/withdraw`), 404, 'Application not found.')
    const unread = (await emp.get('/api/me/counts')).body.notifications; expect((await a.c.post(`/api/applications/${second.id}/withdraw`)).body.status).toBe('withdrawn')
    expect((await emp.get('/api/me/counts')).body.notifications).toBe(unread + 1); expect((await a.c.post('/api/applications', { jobId: 'j6' })).status).toBe(201)
  })
  it('applications are private to the candidate and the job\'s employer', async () => {
    const a = await newUser(s, 'seeker', 'Private One'), b = await newUser(s, 'seeker', 'Private Two'), other = await newUser(s, 'employer', 'Nosy Co')
    const app = (await a.c.post('/api/applications', { jobId: 'j3', message: 'secret hello' })).body
    err(await b.c.get(`/api/applications/${app.id}`), 404); err(await other.c.get(`/api/applications/${app.id}`), 404)
    expect((await a.c.get(`/api/applications/${app.id}`)).status).toBe(200); expect((await (await s.as(EMPLOYER)).get(`/api/applications/${app.id}`)).status).toBe(200)
    expect((await b.c.get('/api/applications/mine')).body).toEqual([]); expect((await other.c.get('/api/applications/employer')).body).toEqual([])
    err(await b.c.get(`/api/conversations/${app.conversationId}/messages`), 404); err(await other.c.post(`/api/conversations/${app.conversationId}/messages`, { body: 'hi' }), 404); err(await b.c.post(`/api/conversations/${app.conversationId}/read`), 404)
  })
})

describe('chat, notifications and preferences', () => {
  it('messages reach only the other side: unread counters, one coalesced notification, ordering, validation', async () => {
    const a = await newUser(s, 'seeker', 'Chat Person'), emp = await s.as(EMPLOYER), app = (await a.c.post('/api/applications', { jobId: 'j4', message: 'Hello!' })).body, conv = app.conversationId
    for (const body of ['Welcome aboard!', 'See you Monday.']) expect((await emp.post(`/api/conversations/${conv}/messages`, { body })).status).toBe(201)
    expect((await a.c.get('/api/me/counts')).body.messages).toBe(2); expect((await a.c.get('/api/conversations')).body[0]).toMatchObject({ lastMessage: 'See you Monday.', jobTitle: 'Support agent (remote)' })
    const unread = (await a.c.get('/api/notifications')).body.filter((n: any) => n.category === 'messages' && !n.read); expect(unread).toHaveLength(1); expect(unread[0]).toMatchObject({ kind: 'chat.new', ref: conv, link: `/messages?c=${conv}` })
    expect((await a.c.get(`/api/conversations/${conv}/messages`)).body.map((m: any) => m.body)).toEqual(['Hello!', 'Welcome aboard!', 'See you Monday.'])
    expect((await a.c.post(`/api/conversations/${conv}/read`)).status).toBe(204); expect((await a.c.get('/api/me/counts')).body.messages).toBe(0); expect((await emp.get('/api/me/counts')).body.messages).toBeGreaterThanOrEqual(1)
    err(await emp.post(`/api/conversations/${conv}/messages`, { body: '   ' }), 400, 'Write a message first.'); err(await emp.post(`/api/conversations/${conv}/messages`, { body: 'x'.repeat(2001) }), 400, 'Keep messages under 2,000 characters.')
    const xss = '<img src=x onerror=alert(1)>'; expect((await a.c.post(`/api/conversations/${conv}/messages`, { body: xss })).body.body).toBe(xss)   // stored as data; React escapes it on display
    expect((await emp.get('/api/notifications')).body.find((n: any) => n.link === `/employer/messages?c=${conv}`)).toBeTruthy()
  })
  it('notification preferences are honoured (system messages always arrive); read state is per user', async () => {
    const a = await newUser(s, 'seeker', 'Prefs Person'), emp = await s.as(EMPLOYER), app = (await a.c.post('/api/applications', { jobId: 'j2' })).body
    expect((await a.c.get('/api/me/prefs')).body).toEqual({ applications: true, messages: true, jobs: true, interviews: true })
    expect((await a.c.put('/api/me/prefs', { applications: true, messages: false, jobs: true, interviews: true })).status).toBe(200); err(await a.c.put('/api/me/prefs', { messages: 'no' }), 400)
    await emp.post(`/api/conversations/${app.conversationId}/messages`, { body: 'Quiet message' })
    expect((await a.c.get('/api/notifications')).body.filter((n: any) => n.category === 'messages')).toHaveLength(0); expect((await a.c.get('/api/me/counts')).body.messages).toBe(1)   // still counted as unread in the chat
    expect((await a.c.get('/api/notifications')).body.filter((n: any) => n.category === 'system')).toHaveLength(1)
    const mine = (await a.c.get('/api/notifications')).body[0], theirs = await newUser(s, 'seeker', 'Someone Else')
    await theirs.c.post(`/api/notifications/${mine.id}/read`); expect((await a.c.get('/api/me/counts')).body.notifications).toBe(1)   // another user can't mark mine as read
    await a.c.post(`/api/notifications/${mine.id}/read`); expect((await a.c.get('/api/me/counts')).body.notifications).toBe(0)
    await emp.post(`/api/applications/${app.id}/status`, { status: 'under_review' }); await a.c.post('/api/notifications/read-all'); expect((await a.c.get('/api/me/counts')).body.notifications).toBe(0)
  })
})

describe('saved jobs, reports, profiles', () => {
  it('saved jobs are per user and only for live jobs', async () => {
    const a = await newUser(s, 'seeker', 'Saver'), b = await newUser(s, 'seeker', 'Other Saver')
    expect((await a.c.post('/api/saved/j1/toggle')).body).toEqual({ saved: true, ids: ['j1'] }); expect((await b.c.get('/api/saved')).body).toEqual([])
    expect((await a.c.post('/api/saved/j1/toggle')).body).toEqual({ saved: false, ids: [] }); err(await a.c.post('/api/saved/j7/toggle'), 404); err(await a.c.post('/api/saved/nope/toggle'), 404); err(await (await s.as(EMPLOYER)).get('/api/saved'), 403)
  })
  it('reports are validated, de-duplicated per user, and closable only by admins; open reports raise a job\'s risk', async () => {
    const a = await newUser(s, 'seeker', 'Reporter'), b = await newUser(s, 'seeker', 'Reporter Two'), admin = await s.as(ADMIN)
    err(await a.c.post('/api/reports', { targetId: 'j1', reason: 'nope' }), 400, 'Choose a reason for your report.'); err(await a.c.post('/api/reports', { targetId: 'j1', reason: 'scam', details: 'x'.repeat(1001) }), 400, /under 1,000/); err(await a.c.post('/api/reports', { targetId: 'zzz', reason: 'scam' }), 404, 'Job not found.')
    const r = await a.c.post('/api/reports', { targetId: 'j1', reason: 'misleading', details: '  Wrong pay.  ' }); expect(r.status).toBe(201); expect(r.body).toMatchObject({ status: 'open', details: 'Wrong pay.', reporterId: a.id })
    err(await a.c.post('/api/reports', { targetId: 'j1', reason: 'scam' }), 409, /already reported/); expect((await b.c.post('/api/reports', { targetId: 'j1', reason: 'scam' })).status).toBe(201)
    err(await a.c.patch(`/api/admin/reports/${r.body.id}`, { status: 'resolved' }), 403); err(await admin.patch('/api/admin/reports/zzz', { status: 'resolved' }), 404, 'That report no longer exists.'); err(await admin.patch(`/api/admin/reports/${r.body.id}`, { status: 'open' }), 400)
    expect((await admin.get('/api/admin/reports')).body.filter((x: any) => x.targetId === 'j1' && x.status === 'open')).toHaveLength(2)
    expect((await admin.get('/api/admin/review/j1')).body.risk.signals).toContain('2 open reports from users')
    await admin.patch(`/api/admin/reports/${r.body.id}`, { status: 'resolved' }); expect((await admin.get('/api/admin/review/j1')).body.risk.signals).toContain('1 open report from users')
    expect((await a.c.post('/api/reports', { targetId: 'j1', reason: 'scam' })).status).toBe(201)   // after resolution a user can report again
  })
  it('profile saves are validated, keep server-owned fields, and only seekers can use them', async () => {
    const seeker = await s.as(SEEKER), p = (o: object) => seeker.put('/api/me/profile', profileBody(o))
    err(await p({ skills: [] }), 400, 'Pick or add at least one skill.'); err(await p({ jobTypes: [] }), 400, 'Choose at least one job type.'); err(await p({ headline: 'ab' }), 400, /headline/)
    err(await p({ availability: [{ dayOfWeek: 0, startHour: 12, endHour: 12, kind: 'available' }] }), 400, 'An availability range must end after it starts.')
    err(await p({ availableFrom: '2026-11-10', availableUntil: '2026-11-01' }), 400, 'The end date must be after the start date.'); err(await p({ skills: Array.from({ length: 13 }, (_, i) => `s${i}`) }), 400, 'Choose up to 12 skills.')
    const ok = await p({ skills: ['English', 'english', 'Teaching'], rating: 5, role: 'admin', id: 'a1', languages: ['Klingon'] })
    expect(ok.status).toBe(200); expect(ok.body.session.user).toMatchObject({ id: 's1', role: 'seeker' }); expect(ok.body.session.profile).toMatchObject({ rating: 4.8, skills: ['English', 'Teaching'], role: 'seeker', id: 's1' }); expect(ok.body.session.profile.languages).not.toContain('Klingon')
    expect((await seeker.put('/api/me/availability', { availability: [{ dayOfWeek: 2, startHour: 9, endHour: 12, kind: 'preferred' }] })).status).toBe(204)
    expect((await seeker.get('/api/auth/me')).body.session.profile.availability).toEqual([{ id: '2-9', dayOfWeek: 2, startHour: 9, endHour: 12, kind: 'preferred' }])
    err(await seeker.put('/api/me/availability', { availability: [{ dayOfWeek: 9, startHour: 9, endHour: 12, kind: 'available' }] }), 400); err(await (await s.as(EMPLOYER)).put('/api/me/profile', profileBody()), 403)
    err(await (await newUser(s, 'seeker', 'Fresh', false)).c.put('/api/me/availability', { availability: [] }), 400, 'Finish your profile first.')
  })
  it('names and company profiles update consistently', async () => {
    const { c } = await newUser(s, 'seeker', 'Old Name'); const r = await c.patch('/api/me/name', { name: ' New Name ' })
    expect(r.body.session.user.name).toBe('New Name'); expect(r.body.session.profile.name).toBe('New Name'); err(await c.patch('/api/me/name', { name: 'x' }), 400, 'Enter your name.')
    const emp = await s.as(EMPLOYER), co = { name: 'Osh Markaz LLC', industry: 'Food & beverage', city: 'Tashkent', website: 'https://oshmarkaz.example', description: 'Family restaurant.' }
    err(await emp.put('/api/me/company', { ...co, name: '' }), 400, 'Enter your company name.'); err(await emp.put('/api/me/company', { ...co, website: 'oshmarkaz.com' }), 400, 'Enter a website starting with http:// or https://')
    err(await emp.put('/api/me/company', { ...co, description: 'x'.repeat(1001) }), 400, 'Keep the description under 1,000 characters.'); err(await c.put('/api/me/company', co), 403)
    const ok = await emp.put('/api/me/company', co); expect(ok.body.session).toMatchObject({ user: { name: 'Osh Markaz LLC' }, company: { industry: 'Food & beverage' } })
    const job = (await emp.post('/api/employer/jobs', jobBody({ title: 'Branded job' }))).body; expect(job.company).toBe('Osh Markaz LLC')   // new postings use the company name
  })
})
