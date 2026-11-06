import type { ApplicationStatus } from '../types'
import { t } from '../i18n'
export const STATUS_META: Record<ApplicationStatus, { label: string; cls: string }> = {
  submitted: { label: t('Submitted'), cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
  under_review: { label: t('Under review'), cls: 'bg-amber-500/15 text-amberfg' },
  shortlisted: { label: t('Shortlisted'), cls: 'bg-violet/15 text-violetfg' },
  interview: { label: t('Interview'), cls: 'bg-cyan-500/15 text-cyanfg' },
  accepted: { label: t('Accepted'), cls: 'bg-mint/15 text-mintfg' },
  rejected: { label: t('Not selected'), cls: 'bg-red-500/15 text-redfg' },
  withdrawn: { label: t('Withdrawn'), cls: 'bg-slate-500/15 text-muted' },
}
export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const m = STATUS_META[status]
  return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${m.cls}`}>{m.label}</span>
}
