import type { Availability, Job, JobSeeker } from '../types'
const isFree = (a: Availability[], day: number, hour: number) => a.some(x => x.dayOfWeek === day && hour >= x.startHour && hour < x.endHour)
export interface DayCoverage { day: number; ratio: number; gaps: [number, number][] }
/** How much of a job's required schedule a group of people covers together. */
export function computeCoverage(job: Job, people: JobSeeker[]) {
  const { startHour: s, endHour: e, days } = job.schedule
  let total = 0, covered = 0
  const perDay: DayCoverage[] = days.map(day => {
    const gaps: [number, number][] = []
    let gapStart: number | null = null, c = 0
    for (let h = s; h <= e; h++) {
      const ok = h < e && people.some(p => isFree(p.availability, day, h))
      if (ok) c++
      if (h < e && !ok && gapStart === null) gapStart = h
      if ((ok || h === e) && gapStart !== null) { gaps.push([gapStart, h]); gapStart = null }
    }
    total += e - s; covered += c
    return { day, ratio: (e - s) ? c / (e - s) : 0, gaps }
  })
  return { ratio: total ? covered / total : 0, perDay, covered, total }
}
export const isFreeAt = isFree
export const coverageLabel = (p: number) => (p === 100 ? 'Full coverage' : p >= 50 ? 'Partial coverage' : 'Low coverage')
