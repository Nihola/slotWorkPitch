import { randomUUID } from 'node:crypto'
import { get, run, tx } from './db'
import type { Ctx } from './context'
import { hashPassword } from './security'
import { jobs } from '../src/data/jobs'
import { mockSeeker } from '../src/services/mockSeeker'
import { jobData } from './routes/jobs'
import { validatePassword, validateEmail } from '../src/utils/validation'

export const DEMO_PASSWORD = 'demo1234'
const ago = (now: number, min: number) => new Date(now - min * 60_000).toISOString()

/** Demo accounts and sample data. Only runs on an empty database and only when SEED_DEMO is on (default: off in production). */
export async function seedDemo(ctx: Ctx) {
  const { db } = ctx, now = ctx.now()
  if (get<{ c: number }>(db, 'SELECT COUNT(*) c FROM users')!.c > 0) {
    // A database may have been initialized before demo mode was enabled. Add only
    // missing demo logins; never replace user data or duplicate marketplace seeds.
    const seeker = { id: randomUUID(), email: 'seeker@demo.test', name: mockSeeker.name, role: 'seeker', profile: { ...mockSeeker, email: 'seeker@demo.test' } }
    const employer = { id: randomUUID(), email: 'employer@demo.test', name: 'Osh Markaz', role: 'employer', profile: null }
    const admin = { id: randomUUID(), email: 'admin@demo.test', name: 'Platform Admin', role: 'admin', profile: null }
    const records = [seeker, employer, admin] as const
    for (const user of records) {
      if (get(db, 'SELECT 1 FROM users WHERE email = ?', user.email)) continue
      run(db, 'INSERT INTO users (id, email, name, role, pw_hash, onboarded, profile, created_at) VALUES (?,?,?,?,?,1,?,?)',
        user.id, user.email, user.name, user.role, await hashPassword(DEMO_PASSWORD), user.profile ? JSON.stringify(user.profile) : null, new Date(now).toISOString())
    }
    return
  }
  const at = new Date(now).toISOString()
  const hashes = [await hashPassword(DEMO_PASSWORD), await hashPassword(DEMO_PASSWORD), await hashPassword(DEMO_PASSWORD)]   // one salt per account, even though the demo password is shared
  const profile = { ...mockSeeker, email: 'seeker@demo.test' }
  tx(db, () => {
    ;([['s1', 'seeker@demo.test', mockSeeker.name, 'seeker', profile], ['e2', 'employer@demo.test', 'Osh Markaz', 'employer', null], ['a1', 'admin@demo.test', 'Platform Admin', 'admin', null]] as const).forEach(([id, email, name, role, prof], i) =>
      run(db, 'INSERT INTO users (id, email, name, role, pw_hash, onboarded, profile, created_at) VALUES (?,?,?,?,?,1,?,?)', id, email, name, role, hashes[i], prof ? JSON.stringify(prof) : null, at))
    for (const j of jobs) run(db, 'INSERT INTO jobs (id, employer_id, moderation, posted_at, data) VALUES (?,?,?,?,?)', j.id, j.employerId, j.moderation, j.postedAt, jobData(j as unknown as Record<string, unknown>))
    run(db, 'INSERT INTO applications (id, job_id, seeker_id, employer_id, status, created_at, updated_at, data) VALUES (?,?,?,?,?,?,?,?)', 'app-demo1', 'j2', 's1', 'e2', 'shortlisted', ago(now, 2880), ago(now, 180),
      JSON.stringify({ jobTitle: 'Restaurant assistant', company: 'Osh Markaz', candidate: profile, shiftId: 'sh2', shiftLabel: 'Afternoon', shiftStart: 13, shiftEnd: 18, message: "Hello! I'm interested in the afternoon shift.", conversationId: 'c-app-demo1',
        history: [{ status: 'submitted', at: ago(now, 2880) }, { status: 'under_review', at: ago(now, 1440) }, { status: 'shortlisted', at: ago(now, 180) }] }))
    run(db, 'INSERT INTO conversations (id, application_id, job_id, job_title, company, shift_label, seeker_id, seeker_name, employer_id, last_message, last_at, unread_seeker, unread_employer) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0)',
      'c-app-demo1', 'app-demo1', 'j2', 'Restaurant assistant', 'Osh Markaz', 'Afternoon', 's1', mockSeeker.name, 'e2', 'Hi Dilnoza, thanks for applying. Can you start next week?', ago(now, 175))
    for (const [id, sid, sname, body, min] of [['m-seed1', 's1', mockSeeker.name, "Hello! I'm interested in the afternoon shift.", 2880], ['m-seed2', 'e2', 'Osh Markaz', 'Hi Dilnoza, thanks for applying. Can you start next week?', 175]] as const)
      run(db, 'INSERT INTO messages (id, conversation_id, sender_id, sender_name, body, sent_at) VALUES (?,?,?,?,?,?)', id, 'c-app-demo1', sid, sname, body, ago(now, min))
    for (const [id, uid, cat, kind, params, body, link, ref, read, min] of [
      ['n-seed1', 's1', 'applications', 'application.shortlisted', { company: 'Osh Markaz', job: 'Restaurant assistant' }, 'Your application for Restaurant assistant was shortlisted.', '/applications/app-demo1', null, 0, 180],
      ['n-seed2', 's1', 'messages', 'chat.new', { name: 'Osh Markaz' }, 'New message from Osh Markaz.', '/messages?c=c-app-demo1', 'c-app-demo1', 0, 175],
      ['n-seed3', 's1', 'jobs', 'job.match', { job: 'English tutor', company: 'Bright Academy', percent: 94 }, 'New 94% match found: English tutor at Bright Academy.', '/jobs/j1', null, 1, 600],
      ['n-seed4', 'e2', 'applications', 'application.new', { name: 'Dilnoza K.', job: 'Restaurant assistant' }, 'Dilnoza K. applied to Restaurant assistant.', '/employer/applications', null, 1, 2880],
    ] as const) run(db, 'INSERT INTO notifications (id, user_id, category, kind, params, body, link, ref, read, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', id, uid, cat, kind, JSON.stringify(params), body, link, ref, read, ago(now, min))
    for (const [id, target, reason, rep, details, min] of [['r-seed1', 'j8', 'scam', 'seed-1', 'They asked me to pay a fee before I could start.', 3000], ['r-seed2', 'j8', 'payment_scam', 'seed-2', null, 2900], ['r-seed3', 'j5', 'misleading', 'seed-3', 'The hours discussed at the interview were different.', 3100]] as const)
      run(db, "INSERT INTO reports (id, target_id, reason, details, reporter_id, status, created_at) VALUES (?,?,?,?,?, 'open', ?)", id, target, reason, details, rep, ago(now, min))
  })
}

/** In production, the first admin is created from ADMIN_EMAIL / ADMIN_PASSWORD (never from source code). */
export async function ensureAdmin(ctx: Ctx) {
  const { db, cfg } = ctx
  if (!cfg.adminEmail || !cfg.adminPassword || get(db, "SELECT 1 FROM users WHERE role = 'admin'")) return
  const bad = validateEmail(cfg.adminEmail) || validatePassword(cfg.adminPassword)
  if (bad) { console.warn(`ADMIN_EMAIL / ADMIN_PASSWORD ignored: ${bad}`); return }
  run(db, "INSERT INTO users (id, email, name, role, pw_hash, onboarded, created_at) VALUES (?,?,?,'admin',?,1,?)", randomUUID(), cfg.adminEmail.trim().toLowerCase(), 'Administrator', await hashPassword(cfg.adminPassword), new Date(ctx.now()).toISOString())
  console.log(`Created admin account for ${cfg.adminEmail}`)
}
