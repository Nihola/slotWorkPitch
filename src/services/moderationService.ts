import { api, asDomain, orUndefined } from '../api/client'
import type { Job, ModerationEntry, Report } from '../types'
import type { Risk } from '../utils/risk'

export class ModerationError extends Error {}
export const MIN_REASON = 10
const rej = asDomain(ModerationError)
export interface Review { job: Job; risk: Risk; reports: Report[]; employerJobs: Job[]; employerLog: ModerationEntry[]; jobLog: ModerationEntry[] }
const enc = encodeURIComponent
/** Risk scoring and every rule below are enforced on the server; the UI only displays the result. */
export const moderationService = {
  getQueue: (): Promise<{ job: Job; risk: Risk }[]> => api('GET', '/admin/queue'),
  getReviewed: (): Promise<ModerationEntry[]> => api('GET', '/admin/reviewed'),
  getReview: async (id: string): Promise<Review | null> => (await api<Review>('GET', `/admin/review/${enc(id)}`).catch(orUndefined)) ?? null,
  approve: async (id: string, opts: { acknowledgedRisk?: boolean } = {}) => { await api('POST', `/admin/jobs/${enc(id)}/approve`, opts).catch(rej) },
  reject: async (id: string, reason: string) => { await api('POST', `/admin/jobs/${enc(id)}/reject`, { reason }).catch(rej) },
  requestChanges: async (id: string, note: string) => { await api('POST', `/admin/jobs/${enc(id)}/request-changes`, { reason: note }).catch(rej) },
}
