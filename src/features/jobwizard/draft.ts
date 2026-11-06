import { t } from '../../i18n'
import type { Job, NewJob, JobType, User } from '../../types'

export interface ShiftDraft { id: string; label: string; startHour: number; endHour: number }
export interface JobDraft {
  title: string; category: string; type: JobType | ''; description: string; positions: string
  salaryMin: string; salaryMax: string; salaryPeriod: Job['salaryPeriod']; paymentFrequency: string
  workMode: NonNullable<Job['workMode']> | ''; city: string; district: string; address: string
  skills: string[]; experience: string; education: string; languages: string[]
  days: number[]; startHour: number; endHour: number; flexible: boolean; shifts: ShiftDraft[]
}
export type Errors = Partial<Record<string, string>>
export const STEPS = ['Basics', 'Pay', 'Location', 'Requirements', 'Schedule', 'Preview'] as const
/** Matches the availability grid, so every posted hour can actually be matched. */
export const WORK_FROM = 8
export const WORK_TO = 22
export const CATEGORIES = ['Education', 'Food & beverage', 'Retail', 'Events', 'Customer support', 'Logistics', 'Office & admin', 'Other']

export const emptyDraft = (): JobDraft => ({
  title: '', category: '', type: '', description: '', positions: '1', salaryMin: '', salaryMax: '', salaryPeriod: 'month', paymentFrequency: 'Monthly',
  workMode: '', city: '', district: '', address: '', skills: [], experience: '', education: '', languages: [],
  days: [0, 1, 2, 3, 4], startHour: 9, endHour: 18, flexible: false, shifts: [],
})

const num = (s: string) => (s.trim() === '' ? NaN : Number(s))
export function validateStep(step: number, d: JobDraft): Errors {
  const e: Errors = {}
  if (step === 0) {
    if (d.title.trim().length < 3) e.title = t('Enter a job title.')
    if (!d.category) e.category = t('Choose a category.')
    if (!d.type) e.type = t('Choose a job type.')
    if (d.description.trim().length < 20) e.description = t('Describe the role in at least 20 characters.')
    const p = num(d.positions); if (!Number.isInteger(p) || p < 1 || p > 500) e.positions = t('Enter a whole number from 1 to 500.')
  }
  if (step === 1) {
    const min = num(d.salaryMin), max = num(d.salaryMax)
    if (!(min > 0)) e.salaryMin = t('Enter the pay amount.')
    if (d.salaryMax.trim() !== '' && !(max >= min)) e.salaryMax = t('The maximum must be at least the minimum.')
    if (!d.paymentFrequency) e.paymentFrequency = t('Choose how often you pay.')
  }
  if (step === 2) {
    if (!d.workMode) e.workMode = t('Choose where the work happens.')
    else if (d.workMode !== 'remote') {
      if (!d.city) e.city = t('Choose a city.')
      if (d.address.trim().length < 3) e.address = t('Add the address so candidates can judge the commute.')
    }
  }
  if (step === 4) {
    if (d.days.length < 1) e.days = t('Choose at least one working day.')
    if (d.endHour <= d.startHour) e.hours = t('The end time must be after the start time.')
    else if (d.startHour < WORK_FROM || d.endHour > WORK_TO) e.hours = `Jobs can be scheduled between ${WORK_FROM}:00 and ${WORK_TO}:00.`
    d.shifts.forEach((s, i) => {
      if (!s.label.trim()) e[`shift-${i}`] = t('Name this shift.')
      else if (s.endHour <= s.startHour) e[`shift-${i}`] = t('A shift must end after it starts.')
      else if (s.startHour < d.startHour || s.endHour > d.endHour) e[`shift-${i}`] = `A shift must fall within ${d.startHour}:00–${d.endHour}:00.`
    })
  }
  return e
}

export function buildJob(user: User, d: JobDraft): NewJob {
  const min = Number(d.salaryMin), max = d.salaryMax.trim() === '' ? min : Number(d.salaryMax), remote = d.workMode === 'remote'
  return {
    title: d.title.trim(), employerId: user.id, company: user.name, verification: 'unverified',
    city: remote ? 'Remote' : d.city, district: remote ? '' : d.district.trim(), type: d.type as JobType,
    salaryMin: min, salaryMax: max, salaryPeriod: d.salaryPeriod, skills: d.skills,
    schedule: { days: [...d.days].sort((a, b) => a - b), startHour: d.startHour, endHour: d.endHour, flexible: d.flexible, shifts: d.shifts.map(s => ({ id: s.id, label: s.label.trim(), startHour: s.startHour, endHour: s.endHour })) },
    description: d.description.trim(), category: d.category, positions: Number(d.positions), address: remote ? undefined : d.address.trim(),
    workMode: d.workMode as NonNullable<Job['workMode']>, experience: d.experience || undefined, education: d.education || undefined,
    languages: d.languages, paymentFrequency: d.paymentFrequency,
  }
}

/** Inverse of buildJob, used to prefill the wizard when an employer edits a returned job. */
export function jobToDraft(j: Job): JobDraft {
  const remote = j.workMode === 'remote' || (!j.workMode && j.city === 'Remote')
  return {
    title: j.title, category: j.category ?? '', type: j.type, description: j.description ?? '', positions: String(j.positions ?? 1),
    salaryMin: String(j.salaryMin), salaryMax: j.salaryMax === j.salaryMin ? '' : String(j.salaryMax), salaryPeriod: j.salaryPeriod, paymentFrequency: j.paymentFrequency ?? 'Monthly',
    workMode: j.workMode ?? (remote ? 'remote' : 'on-site'), city: remote ? '' : j.city, district: j.district, address: j.address ?? '',
    skills: [...j.skills], experience: j.experience ?? '', education: j.education ?? '', languages: [...(j.languages ?? [])],
    days: [...j.schedule.days], startHour: j.schedule.startHour, endHour: j.schedule.endHour, flexible: j.schedule.flexible,
    shifts: j.schedule.shifts.map(s => ({ ...s })),
  }
}
