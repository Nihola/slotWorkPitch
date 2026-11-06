import { api, asDomain } from '../api/client'
import type { Report } from '../types'
import { t } from '../i18n'
export class ReportError extends Error {}
const rej = asDomain(ReportError)
export const REPORT_REASONS: { id: Report['reason']; label: string }[] = [
  { id: 'scam', label: t('Scam') }, { id: 'fake_employer', label: t('Fake employer') }, { id: 'misleading', label: t('Misleading job') },
  { id: 'inappropriate', label: t('Inappropriate content') }, { id: 'harassment', label: t('Harassment') }, { id: 'payment_scam', label: t('Payment scam') }, { id: 'other', label: t('Other') },
]
export const reportService = {
  create: (input: { targetId: string; reason: Report['reason']; details?: string }): Promise<Report> => api<Report>('POST', '/reports', input).catch(rej),
  list: (): Promise<Report[]> => api('GET', '/admin/reports'),
  setStatus: async (id: string, status: 'resolved' | 'dismissed') => { await api('PATCH', `/admin/reports/${encodeURIComponent(id)}`, { status }).catch(rej) },
}
