import type { Job } from '../types'
export type RiskLevel = 'low' | 'medium' | 'high'
export interface Risk { level: RiskLevel; score: number; signals: string[]; mitigations: string[] }

const SCAM = /(registration|joining|training|deposit|security|processing)\s+fee|send\s+money|guaranteed\s+(income|earnings|pay)|get\s+rich|earn\s+\$?\s?\d{3,}\s*(per|a|\/)\s*(day|week)/i
const OFF_PLATFORM = /(telegram|whatsapp|t\.me\/|wa\.me\/|\+998[\d\s-]{9,})/i
export const RISK_HIGH = 50
export const RISK_MEDIUM = 20

/** Explainable, additive risk score. Every point comes with a human-readable signal. */
export function computeRisk(job: Job, ctx: { openReports: number; priorRejections: number }): Risk {
  const signals: string[] = [], mitigations: string[] = []
  let score = 0
  const add = (pts: number, msg: string) => { score += pts; signals.push(msg) }
  const text = `${job.title} ${job.description ?? ''}`
  if (job.verification === 'unverified') add(20, 'Employer is not verified')
  if ((job.description ?? '').trim().length < 40) add(10, 'Very short description')
  if (SCAM.test(text)) add(45, 'Mentions fees, deposits or guaranteed earnings')
  if (OFF_PLATFORM.test(text)) add(20, 'Asks candidates to contact outside the platform')
  const max = job.salaryMax, p = job.salaryPeriod
  if ((p === 'month' && max > 2500) || (p === 'day' && max > 150) || (p === 'hour' && max > 40)) add(25, 'Pay is unusually high for this kind of job')
  const letters = job.title.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 8 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7) add(10, 'Title is written in capitals')
  if ((job.workMode === 'on-site' || job.workMode === 'hybrid') && !job.address?.trim()) add(10, 'No work address given')
  if (ctx.openReports > 0) add(Math.min(45, ctx.openReports * 15), `${ctx.openReports} open report${ctx.openReports > 1 ? 's' : ''} from users`)
  if (ctx.priorRejections > 0) add(Math.min(30, ctx.priorRejections * 10), `${ctx.priorRejections} earlier job${ctx.priorRejections > 1 ? 's' : ''} from this employer rejected`)
  if (job.verification === 'trusted') { score -= 20; mitigations.push('Trusted employer') }
  else if (job.verification === 'business') { score -= 10; mitigations.push('Business verified') }
  score = Math.max(0, score)
  return { level: score >= RISK_HIGH ? 'high' : score >= RISK_MEDIUM ? 'medium' : 'low', score, signals, mitigations }
}
