import { api } from '../api/client'
import type { Notification } from '../types'
export type PrefKey = 'applications' | 'messages' | 'jobs' | 'interviews'
export type Prefs = Record<PrefKey, boolean>
export const DEFAULT_PREFS: Prefs = { applications: true, messages: true, jobs: true, interviews: true }
export const notificationService = {
  list: (): Promise<Notification[]> => api('GET', '/notifications'),
  markRead: async (id: string) => { await api('POST', `/notifications/${encodeURIComponent(id)}/read`) },
  markAllRead: async () => { await api('POST', '/notifications/read-all') },
  counts: (): Promise<{ notifications: number; messages: number }> => api('GET', '/me/counts'),
  getPrefs: (): Promise<Prefs> => api('GET', '/me/prefs'),
  setPrefs: (p: Prefs): Promise<Prefs> => api('PUT', '/me/prefs', p),
}
