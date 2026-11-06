import { t } from '../../i18n'
import { cellsToRanges, rangesToCells } from '../../utils/availability'
import type { JobSeeker, JobType, SlotKind, User } from '../../types'

export interface OnboardingDraft {
  name: string; headline: string; skills: string[]; education: string; experience: string; jobTypes: JobType[]
  city: string; district: string; remoteOk: boolean; cells: Map<string, SlotKind>; flexible: boolean; from: string; until: string
}
export type Errors = Partial<Record<string, string>>
export const STEPS = ['About you', 'Skills', 'Experience', 'Job types', 'Location', 'Availability'] as const

export const initialDraft = (name: string, p: JobSeeker | null): OnboardingDraft => ({
  name: p?.name ?? name, headline: p?.headline ?? '', skills: p?.skills ?? [], education: p?.education ?? '', experience: p?.experience ?? '',
  jobTypes: p?.jobTypes ?? [], city: p?.city ?? '', district: p?.district ?? '', remoteOk: p?.remoteOk ?? false,
  cells: rangesToCells(p?.availability ?? []), flexible: p?.flexible ?? false, from: p?.availableFrom ?? '', until: p?.availableUntil ?? '',
})

export function validateStep(step: number, d: OnboardingDraft): Errors {
  const e: Errors = {}
  if (step === 0) {
    if (d.name.trim().length < 2) e.name = t('Enter your name.')
    if (d.headline.trim().length < 3) e.headline = t('Add a short headline, like "Language student".')
  }
  if (step === 1 && d.skills.length < 1) e.skills = t('Pick or add at least one skill.')
  if (step === 2) {
    if (!d.education) e.education = t('Choose your education level.')
    if (!d.experience) e.experience = t('Choose your experience level.')
  }
  if (step === 3 && d.jobTypes.length < 1) e.jobTypes = t('Choose at least one job type.')
  if (step === 4 && !d.city) e.city = t('Choose your city.')
  if (step === 5) {
    if (d.cells.size < 1) e.cells = t('Mark at least one hour you can work.')
    if (d.from && d.until && d.until < d.from) e.until = t('The end date must be after the start date.')
  }
  return e
}

export const weeklyHours = (d: OnboardingDraft) => d.cells.size

export function buildProfile(user: User, d: OnboardingDraft): JobSeeker {
  return {
    id: user.id, name: d.name.trim(), email: user.email, role: 'seeker', avatarUrl: user.avatarUrl, headline: d.headline.trim(),
    city: d.city, district: d.district.trim(), skills: d.skills, languages: [], availability: cellsToRanges(d.cells), rating: 0,
    education: d.education, experience: d.experience, jobTypes: d.jobTypes, remoteOk: d.remoteOk, flexible: d.flexible,
    availableFrom: d.from || undefined, availableUntil: d.until || undefined,
  }
}

export function profileStrength(p: JobSeeker): number {
  const hours = p.availability.reduce((n, a) => n + a.endHour - a.startHour, 0)
  let s = 0
  if (p.name && p.headline) s += 20
  s += p.skills.length >= 3 ? 15 : p.skills.length ? 8 : 0
  if (p.education && p.experience) s += 15
  if (p.jobTypes?.length) s += 15
  if (p.city) s += p.district ? 15 : 10
  s += hours >= 10 ? 20 : hours > 0 ? 10 : 0
  return Math.min(100, s)
}
