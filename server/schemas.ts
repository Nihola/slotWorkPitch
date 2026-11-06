import { z } from 'zod'
import { validateEmail, validatePassword } from './validation.js'

export const JOB_TYPES = ['one-time', 'short-term', 'part-time', 'full-time', 'shift-based', 'remote'] as const
const jobType = z.enum(JOB_TYPES, { message: 'Choose a job type.' })
const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')

export const emailSchema = z.string().max(254, 'Enter a valid email address.').superRefine((v, c) => { const m = validateEmail(v); if (m) c.addIssue({ code: 'custom', message: m }) }).transform(v => v.trim().toLowerCase())
export const passwordSchema = z.string().max(200, 'Use at most 200 characters.').superRefine((v, c) => { const m = validatePassword(v); if (m) c.addIssue({ code: 'custom', message: m }) })
export const nameSchema = z.string().trim().min(2, 'Enter your name.').max(80, 'Keep names under 80 characters.')

export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema, role: z.enum(['seeker', 'employer'], { message: 'Choose what you are looking for.' }) })
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.').max(200, 'Email or password is incorrect.') })

export const availabilitySchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6), startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(1).max(24), kind: z.enum(['available', 'preferred']),
}).refine(a => a.endHour > a.startHour, 'An availability range must end after it starts.')).max(200, 'Too many availability ranges.')

export const profileSchema = z.object({
  headline: z.string().trim().min(3, 'Add a short headline, like "Language student".').max(100, 'Keep the headline under 100 characters.'),
  city: z.string().trim().min(1, 'Choose your city.').max(60), district: text(80).default(''),
  skills: z.array(z.string().trim().min(1).max(30, 'Keep each skill under 30 characters.')).min(1, 'Pick or add at least one skill.').max(12, 'Choose up to 12 skills.'),
  education: text(60).default(''), experience: text(60).default(''), jobTypes: z.array(jobType).min(1, 'Choose at least one job type.').max(6),
  remoteOk: z.boolean().default(false), flexible: z.boolean().default(false), availableFrom: date.optional(), availableUntil: date.optional(), availability: availabilitySchema,
}).refine(p => !p.availableFrom || !p.availableUntil || p.availableUntil >= p.availableFrom, 'The end date must be after the start date.')

export const companySchema = z.object({
  name: z.string().trim().min(2, 'Enter your company name.').max(80, 'Keep names under 80 characters.'), industry: text(60), city: text(60),
  website: z.string().trim().max(200).refine(v => !v || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v), 'Enter a website starting with http:// or https://'),
  description: z.string().max(1000, 'Keep the description under 1,000 characters.'),
})

const hour = z.number().int().min(8, 'Jobs can be scheduled between 8:00 and 22:00.').max(22, 'Jobs can be scheduled between 8:00 and 22:00.')
const shift = z.object({ id: z.string().min(1).max(40), label: z.string().trim().min(1, 'Name this shift.').max(40), startHour: hour, endHour: hour }).refine(s => s.endHour > s.startHour, 'A shift must end after it starts.')
const schedule = z.object({ days: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one working day.').max(7), startHour: hour, endHour: hour, flexible: z.boolean(), shifts: z.array(shift).max(4, 'Use at most 4 shifts.') })
  .refine(s => s.endHour > s.startHour, 'The end time must be after the start time.')
  .refine(s => s.shifts.every(x => x.startHour >= s.startHour && x.endHour <= s.endHour), 'A shift must fall within the working hours.')
const money = z.number({ message: 'Enter the pay amount.' }).positive('Enter the pay amount.').max(1_000_000, 'That amount is too large.')
/** Employer-supplied fields only. Owner, company, verification and moderation status are set by the server, never accepted from the client. */
export const jobSchema = z.object({
  title: z.string().trim().min(3, 'Enter a job title.').max(100, 'Keep the title under 100 characters.'), category: text(60).optional(), type: jobType,
  description: z.string().trim().min(20, 'Describe the role in at least 20 characters.').max(5000, 'Keep the description under 5,000 characters.'),
  positions: z.number().int('Enter a whole number from 1 to 500.').min(1, 'Enter a whole number from 1 to 500.').max(500, 'Enter a whole number from 1 to 500.'),
  salaryMin: money, salaryMax: money, salaryPeriod: z.enum(['hour', 'day', 'month']), paymentFrequency: text(40).optional(),
  workMode: z.enum(['on-site', 'hybrid', 'remote']).optional(), city: z.string().trim().min(1, 'Choose a city.').max(60), district: text(80).default(''), address: text(160).optional(),
  skills: z.array(z.string().trim().min(1).max(30)).max(12, 'Choose up to 12 skills.'), experience: text(60).optional(), education: text(60).optional(), languages: z.array(z.string().trim().min(1).max(30)).max(6).default([]),
  schedule,
}).refine(j => j.salaryMax >= j.salaryMin, 'The maximum must be at least the minimum.')
  .refine(j => j.workMode === 'remote' || j.type === 'remote' || (j.address ?? '').trim().length >= 3, 'Add the address so candidates can judge the commute.')

export const applySchema = z.object({ jobId: z.string().min(1).max(60), shiftId: z.string().max(40).optional(), message: z.string().max(1000, 'Keep your message under 1,000 characters.').optional() })
export const statusSchema = z.object({ status: z.enum(['under_review', 'shortlisted', 'interview', 'accepted', 'rejected']), note: z.string().max(500, 'Keep notes under 500 characters.').optional() })
export const messageSchema = z.object({ body: z.string().max(2000, 'Keep messages under 2,000 characters.') })
export const REPORT_REASONS = ['scam', 'fake_employer', 'misleading', 'inappropriate', 'harassment', 'payment_scam', 'other'] as const
export const reportSchema = z.object({ targetId: z.string().min(1).max(60), reason: z.enum(REPORT_REASONS, { message: 'Choose a reason for your report.' }), details: z.string().max(1000, 'Keep your explanation under 1,000 characters.').optional() })
export const decisionSchema = z.object({ reason: z.string().max(1000, 'Keep the reason under 1,000 characters.').default('') })
export const prefsSchema = z.object({ applications: z.boolean(), messages: z.boolean(), jobs: z.boolean(), interviews: z.boolean() })
