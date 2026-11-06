// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canAccess, guard, homeFor, postAuthTarget } from '../src/utils/access'
import { buildProfile, initialDraft, profileStrength, validateStep as validateOnboarding } from '../src/features/onboarding/draft'
import { buildJob, emptyDraft, jobToDraft, validateStep as validateJob } from '../src/features/jobwizard/draft'
import { rangesToCells } from '../src/utils/availability'
import type { Session } from '../src/services/authService'
import type { SlotKind } from '../src/types'

const sess = (role: 'seeker' | 'employer' | 'admin', onboarded = true): Session => ({ user: { id: 'u1', name: 'N', email: 'n@x.uz', role }, profile: null, onboarded, company: null })
const keys = (e: object) => Object.keys(e).sort().join()

describe('route guards (client-side routing decisions; the server enforces the real rules)', () => {
  it('sends people where their role belongs', () => {
    expect(guard(null, ['seeker'])).toBe('/login'); expect(guard(sess('seeker', false), ['seeker'])).toBe('/onboarding'); expect(guard(sess('seeker', false), ['seeker'], true)).toBeNull()
    expect(guard(sess('seeker'), ['seeker'])).toBeNull(); expect(guard(sess('employer'), ['seeker'])).toBe('/employer'); expect(guard(sess('admin'), ['employer'])).toBe('/admin')
    expect(homeFor(sess('seeker'))).toBe('/dashboard'); expect(homeFor(sess('seeker', false))).toBe('/onboarding'); expect(homeFor(null)).toBe('/')
  })
  it('returns people to the page they asked for only if their role may see it', () => {
    expect(postAuthTarget(sess('seeker', false), '/jobs/j1')).toBe('/onboarding'); expect(postAuthTarget(sess('employer'), '/employer/jobs/j2')).toBe('/employer/jobs/j2'); expect(postAuthTarget(sess('employer'), '/jobs')).toBe('/employer')
    expect(canAccess('seeker', '/jobs/j1')).toBe(true); expect(canAccess('seeker', '/jobsfoo')).toBe(false); expect(canAccess('seeker', '/admin')).toBe(false)
  })
})

describe('onboarding form logic', () => {
  const base = initialDraft('Zarina', null)
  it('validates each step with clear messages', () => {
    expect(keys(validateOnboarding(0, { ...base, name: '' }))).toBe('headline,name'); expect(keys(validateOnboarding(0, { ...base, headline: 'Student' }))).toBe('')
    expect(validateOnboarding(1, base).skills).toBeTruthy(); expect(validateOnboarding(1, { ...base, skills: ['English'] }).skills).toBeUndefined()
    expect(keys(validateOnboarding(2, base))).toBe('education,experience'); expect(validateOnboarding(3, base).jobTypes).toBeTruthy(); expect(validateOnboarding(4, base).city).toBeTruthy()
    const cells = new Map<string, SlotKind>([['0-17', 'available']])
    expect(validateOnboarding(5, base).cells).toBeTruthy(); expect(validateOnboarding(5, { ...base, cells, from: '2026-11-10', until: '2026-11-01' }).until).toBeTruthy(); expect(validateOnboarding(5, { ...base, cells, from: '2026-11-01', until: '2026-11-10' }).until).toBeUndefined()
  })
  it('turns painted cells into availability ranges that keep their kind, and scores profile strength', () => {
    const cells = new Map<string, SlotKind>(); for (let h = 17; h < 21; h++) { cells.set(`0-${h}`, 'available'); cells.set(`1-${h}`, 'preferred') }
    const d = { ...base, name: 'Zarina K.', headline: 'Student', skills: ['English', 'Teaching', 'Service'], education: 'Bachelor student', experience: 'Under 1 year', jobTypes: ['part-time' as const], city: 'Tashkent', district: 'Chilonzor', cells }
    const p = buildProfile({ id: 'u1', name: 'Z', email: 'z@x.uz', role: 'seeker' }, d)
    expect(p.availability.map(a => [a.dayOfWeek, a.startHour, a.endHour, a.kind])).toEqual([[0, 17, 21, 'available'], [1, 17, 21, 'preferred']])
    expect(profileStrength(p)).toBe(90); expect(profileStrength({ ...p, availability: [{ id: 'x', dayOfWeek: 0, startHour: 8, endHour: 20, kind: 'available' }] })).toBe(100)
    expect(rangesToCells(p.availability).size).toBe(8)
  })
})

describe('job posting form logic', () => {
  const d0 = { ...emptyDraft(), title: 'Barista', category: 'Food & beverage', type: 'part-time' as const, description: 'Make coffee and serve guests in the evenings.' }
  const user = { id: 'e9', name: 'Qahva Lab', email: 'q@x.uz', role: 'employer' as const }
  it('validates each step', () => {
    expect(keys(validateJob(0, emptyDraft()))).toBe('category,description,title,type'); expect(keys(validateJob(0, d0))).toBe('')
    for (const p of ['0', '1.5', 'abc', '', '501']) expect(validateJob(0, { ...d0, positions: p }).positions).toBeTruthy(); expect(validateJob(0, { ...d0, positions: '3' }).positions).toBeUndefined()
    expect(keys(validateJob(1, d0))).toBe('salaryMin'); expect(validateJob(1, { ...d0, salaryMin: '300', salaryMax: '200' }).salaryMax).toBeTruthy(); expect(validateJob(1, { ...d0, salaryMin: '-5' }).salaryMin).toBeTruthy()
    expect(validateJob(2, d0).workMode).toBeTruthy(); expect(keys(validateJob(2, { ...d0, workMode: 'on-site' }))).toBe('address,city'); expect(keys(validateJob(2, { ...d0, workMode: 'remote' }))).toBe('')
    expect(validateJob(4, { ...d0, days: [] }).days).toBeTruthy(); expect(validateJob(4, { ...d0, startHour: 12, endHour: 12 }).hours).toBeTruthy()
    expect(validateJob(4, { ...d0, shifts: [{ id: 's', label: '', startHour: 9, endHour: 12 }] })['shift-0']).toBeTruthy(); expect(validateJob(4, { ...d0, shifts: [{ id: 's', label: 'A', startHour: 7, endHour: 12 }] })['shift-0']).toBeTruthy()
    expect(keys(validateJob(4, { ...d0, shifts: [{ id: 's', label: 'A', startHour: 9, endHour: 13 }] }))).toBe('')
  })
  it('builds a clean job and can rebuild the form from it (edit & resubmit)', () => {
    const d = { ...d0, salaryMin: '260', workMode: 'on-site' as const, city: 'Tashkent', district: ' Mirobod ', address: ' Amir Temur 5 ', days: [4, 0, 2], skills: ['Coffee'], shifts: [{ id: 's1', label: ' Early ', startHour: 9, endHour: 13 }] }
    const j = buildJob(user, d)
    expect(j).toMatchObject({ district: 'Mirobod', address: 'Amir Temur 5', salaryMax: 260, employerId: 'e9' }); expect(j.schedule.days).toEqual([0, 2, 4]); expect(j.schedule.shifts[0].label).toBe('Early')
    const r = buildJob(user, { ...d, workMode: 'remote' }); expect(r).toMatchObject({ city: 'Remote', district: '' }); expect(r.address).toBeUndefined()
    const job = { ...j, id: 'x', postedAt: '', moderation: 'pending' as const }
    expect(JSON.stringify(buildJob(user, jobToDraft(job)))).toBe(JSON.stringify(j))
  })
})
