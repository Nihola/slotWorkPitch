import { api, orUndefined } from '../api/client'
import type { Job, NewJob } from '../types'
/** Owner, company, verification and moderation status are decided by the server; only the fields in NewJob are used from the form. */
export const jobService = {
  getJobs: (): Promise<Job[]> => api('GET', '/jobs'),
  getJobById: (id: string): Promise<Job | undefined> => api<Job>('GET', `/jobs/${encodeURIComponent(id)}`).catch(orUndefined),
  getEmployerJobs: (): Promise<Job[]> => api('GET', '/employer/jobs'),
  createJob: (input: NewJob): Promise<Job> => api('POST', '/employer/jobs', input),
  /** An employer edits a returned (changes requested / rejected) job and resubmits it for review. */
  updateJob: (id: string, input: NewJob): Promise<Job> => api('PUT', `/employer/jobs/${encodeURIComponent(id)}`, input),
  getAllJobs: (): Promise<Job[]> => api('GET', '/admin/jobs'),
}
