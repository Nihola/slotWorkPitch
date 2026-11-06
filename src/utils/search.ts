import type { Job, JobType } from '../types'

export interface ParsedQuery { keywords: string[]; types: JobType[]; city?: string; after?: number; remote: boolean; chips: string[] }
const CITIES = ['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan', 'Fergana']
const TYPE_PATTERNS: [RegExp, JobType, string][] = [
  [/\bpart[\s-]?time\b/, 'part-time', 'Part-time'], [/\bfull[\s-]?time\b/, 'full-time', 'Full-time'], [/\bshift(?:s|[\s-]?based)?\b/, 'shift-based', 'Shift-based'],
  [/\bshort[\s-]?term\b/, 'short-term', 'Short-term'], [/\bone[\s-]?time\b/, 'one-time', 'One-time'],
]
const STOP = new Set(['job', 'jobs', 'work', 'works', 'working', 'position', 'positions', 'opportunity', 'opportunities', 'in', 'at', 'after', 'the', 'a', 'an', 'for', 'with', 'and', 'near', 'me', 'i', 'want', 'find', 'looking', 'of', 'to', 'on', 'from', 'around'])
const cap = (w: string) => w[0].toUpperCase() + w.slice(1)

/** Turns "Part-time English teaching jobs after 5pm in Tashkent" into filters. Runs locally; swap for an NLP service later. */
export function parseQuery(q: string): ParsedQuery {
  let s = ` ${q.toLowerCase().replace(/[.,!?]/g, ' ')} `
  const types: JobType[] = [], typeChips: string[] = []
  for (const [re, t, label] of TYPE_PATTERNS) if (re.test(s)) { types.push(t); typeChips.push(label); s = s.replace(re, ' ') }
  const remoteRe = /\b(remote|work from home|online)\b/g
  const remote = remoteRe.test(s); s = s.replace(remoteRe, ' ')
  let city: string | undefined
  for (const c of CITIES) { const re = new RegExp(`\\b${c.toLowerCase()}\\b`); if (re.test(s)) { city = c; s = s.replace(re, ' '); break } }
  let after: number | undefined
  const m = s.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (m) {
    let h = Number(m[1]); const ap = m[3]
    if (ap === 'pm' && h < 12) h += 12; else if (ap === 'am' && h === 12) h = 0; else if (!ap && h < 8) h += 12
    if (h >= 0 && h <= 23) after = h
    s = s.replace(m[0], ' ')
  }
  const keywords = s.split(/\s+/).filter(w => w.length > 1 && !STOP.has(w))
  const chips = [...keywords.map(cap), ...typeChips, ...(after !== undefined ? [`After ${String(after).padStart(2, '0')}:00`] : []), ...(remote ? ['Remote'] : []), ...(city ? [city] : [])]
  return { keywords, types, city, after, remote, chips }
}

const isRemote = (j: Job) => j.type === 'remote' || j.workMode === 'remote'
export function matchesQuery(job: Job, p: ParsedQuery): boolean {
  if (p.types.length && !p.types.includes(job.type)) return false
  if (p.remote && !isRemote(job)) return false
  if (p.city && job.city !== p.city && !isRemote(job)) return false
  if (p.after !== undefined && job.schedule.endHour <= p.after) return false
  const words = [job.title, job.company, job.category ?? '', ...job.skills].join(' ').toLowerCase().split(/[^a-z0-9]+/)
  return p.keywords.every(k => { const stem = k.slice(0, Math.min(5, k.length)); return words.some(w => w.startsWith(stem)) })
}
/** Rough monthly figure so pay can be compared across hour/day/month listings. It follows the job's own schedule; one-time jobs count only their own shifts. */
export function monthlyPay(j: Job): number {
  const days = j.schedule.days.length, perMonth = j.type === 'one-time' ? 1 : 4.33   // weeks per month
  const hours = Math.max(0, j.schedule.endHour - j.schedule.startHour)
  if (j.salaryPeriod === 'month') return j.salaryMax
  if (j.salaryPeriod === 'day') return Math.round(j.salaryMax * days * perMonth)
  return Math.round(j.salaryMax * hours * days * perMonth)
}
