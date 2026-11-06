import { api, asDomain } from '../api/client'
import { FINAL, TRANSITIONS } from '../utils/applicationRules'
import type { Application, ApplicationStatus, Job } from '../types'

export { FINAL, TRANSITIONS }
export class ApplicationError extends Error {}
const rej = asDomain(ApplicationError)
export const applicationService = {
  /** The candidate (profile, skills, availability) is read from the signed-in account on the server. */
  apply: (input: { job: Job; shiftId?: string; message?: string }): Promise<Application> => api<Application>('POST', '/applications', { jobId: input.job.id, shiftId: input.shiftId, message: input.message }).catch(rej),
  listForSeeker: (): Promise<Application[]> => api('GET', '/applications/mine'),
  listForEmployer: (): Promise<Application[]> => api('GET', '/applications/employer'),
  get: (id: string): Promise<Application | undefined> => api<Application>('GET', `/applications/${encodeURIComponent(id)}`).catch(e => { if (e?.status === 404) return undefined; throw e }),
  /** The seeker's current (not closed) application to a job, if any. */
  findActive: async (jobId: string): Promise<Application | null> => (await api<{ application: Application | null }>('GET', `/applications/active?jobId=${encodeURIComponent(jobId)}`)).application,
  setStatus: (id: string, status: ApplicationStatus, note?: string): Promise<Application> => api<Application>('POST', `/applications/${encodeURIComponent(id)}/status`, { status, note }).catch(rej),
  withdraw: (id: string): Promise<Application> => api<Application>('POST', `/applications/${encodeURIComponent(id)}/withdraw`).catch(rej),
}
