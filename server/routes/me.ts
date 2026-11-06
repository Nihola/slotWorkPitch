import { Router } from 'express'
import { z } from 'zod'
import type { Ctx } from '../context'
import { get, run } from '../db'
import { bad, parse } from '../http'
import { requireAuth, requireRole } from '../auth'
import { hashPassword, verifyPassword, sha256, readCookie, COOKIE } from '../security'
import { availabilitySchema, companySchema, nameSchema, passwordSchema, prefsSchema, profileSchema } from '../schemas'
import { getPrefs, setPrefs, unreadMessages, unreadNotifications } from '../notify'
import { sessionOf } from './auth'
import type { UserRow } from '../mappers'
import type { JobSeeker } from '../../src/types'
import { persistentAuthEnabled, persistentDeleteUserSessions, persistentSaveUser } from '../persistentAuth'

const row = (ctx: Ctx, id: string) => get<UserRow>(ctx.db, 'SELECT * FROM users WHERE id = ?', id)!
export function meRoutes(ctx: Ctx) {
  const r = Router(), { db } = ctx
  r.use(requireAuth)

  r.patch('/name', async (req, res) => {
    const { name } = parse(z.object({ name: nameSchema }), req.body), u = row(ctx, req.user!.id)
    const profile = u.profile ? JSON.stringify({ ...JSON.parse(u.profile), name }) : null
    run(db, 'UPDATE users SET name = ?, profile = ? WHERE id = ?', name, profile, u.id)
    if (persistentAuthEnabled()) await persistentSaveUser(row(ctx, u.id))
    res.json({ session: sessionOf(ctx, u.id) })
  })

  r.post('/password', async (req, res) => {
    const { current, next } = parse(z.object({ current: z.string().max(200), next: passwordSchema }), req.body), u = row(ctx, req.user!.id)
    if (!(await verifyPassword(current, u.pw_hash))) throw bad('Your current password is incorrect.')
    if (current === next) throw bad('Choose a password you have not used just now.')
    const hash = await hashPassword(next)
    run(db, 'UPDATE users SET pw_hash = ? WHERE id = ?', hash, u.id)
    if (persistentAuthEnabled()) {
      await persistentSaveUser(row(ctx, u.id))
      const keep = readCookie(req, COOKIE); await persistentDeleteUserSessions(u.id, keep ? sha256(keep) : '')
    }
    const keep = readCookie(req, COOKIE); run(db, 'DELETE FROM sessions WHERE user_id = ? AND id <> ?', u.id, keep ? sha256(keep) : '')   // sign out every other device
    res.status(204).end()
  })

  r.put('/company', requireRole('employer'), async (req, res) => {
    const c = parse(companySchema, req.body)
    run(db, 'UPDATE users SET company = ?, name = ? WHERE id = ?', JSON.stringify(c), c.name, req.user!.id)
    if (persistentAuthEnabled()) await persistentSaveUser(row(ctx, req.user!.id))
    res.json({ session: sessionOf(ctx, req.user!.id) })
  })

  r.put('/profile', requireRole('seeker'), async (req, res) => {
    const p = parse(profileSchema, req.body), u = row(ctx, req.user!.id), old = u.profile ? (JSON.parse(u.profile) as JobSeeker) : null
    const profile: JobSeeker = {
      id: u.id, name: u.name, email: u.email, role: 'seeker', headline: p.headline, city: p.city, district: p.district, skills: p.skills.filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i),   // drop case-insensitive duplicates, keep the first spelling
      languages: old?.languages ?? [], rating: old?.rating ?? 0, education: p.education, experience: p.experience, jobTypes: p.jobTypes, remoteOk: p.remoteOk, flexible: p.flexible,
      availableFrom: p.availableFrom, availableUntil: p.availableUntil, availability: p.availability.map(a => ({ id: `${a.dayOfWeek}-${a.startHour}`, ...a })),
    }
    run(db, 'UPDATE users SET profile = ?, onboarded = 1 WHERE id = ?', JSON.stringify(profile), u.id)
    if (persistentAuthEnabled()) await persistentSaveUser(row(ctx, u.id))
    res.json({ session: sessionOf(ctx, u.id) })
  })

  r.put('/availability', requireRole('seeker'), async (req, res) => {
    const availability = parse(z.object({ availability: availabilitySchema }), req.body).availability, u = row(ctx, req.user!.id)
    if (!u.profile) throw bad('Finish your profile first.')
    run(db, 'UPDATE users SET profile = ? WHERE id = ?', JSON.stringify({ ...JSON.parse(u.profile), availability: availability.map(a => ({ id: `${a.dayOfWeek}-${a.startHour}`, ...a })) }), u.id)
    if (persistentAuthEnabled()) await persistentSaveUser(row(ctx, u.id))
    res.status(204).end()
  })

  r.get('/prefs', (req, res) => res.json(getPrefs(db, req.user!.id)))
  r.put('/prefs', (req, res) => { const p = parse(prefsSchema, req.body); setPrefs(db, req.user!.id, p); res.json(p) })
  r.get('/counts', (req, res) => res.json({ notifications: unreadNotifications(db, req.user!.id), messages: unreadMessages(db, req.user!.id) }))
  return r
}
