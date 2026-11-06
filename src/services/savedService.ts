import { api } from '../api/client'
export const savedService = {
  get: (): Promise<string[]> => api('GET', '/saved'),
  /** Returns the full list after the toggle. */
  toggle: (jobId: string): Promise<{ saved: boolean; ids: string[] }> => api('POST', `/saved/${encodeURIComponent(jobId)}/toggle`),
}
