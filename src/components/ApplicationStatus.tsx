import { Check, X } from 'lucide-react'
import { shortDate } from '../utils/time'
import type { ApplicationStatus as Status, StatusEvent } from '../types'
import { t } from '../i18n'

const FLOW: { key: Status; label: string }[] = [
  { key: 'submitted', label: t('Submitted') }, { key: 'under_review', label: t('Under review') }, { key: 'shortlisted', label: t('Shortlisted') },
  { key: 'interview', label: t('Interview') }, { key: 'accepted', label: t('Accepted') },
]
/** Progress timeline. Closed applications show how far they got, then a final red step. */
export default function ApplicationStatus({ status, history = [] }: { status: Status; history?: StatusEvent[] }) {
  const closed = status === 'rejected' || status === 'withdrawn'
  const reached = Math.max(0, ...history.map(h => FLOW.findIndex(f => f.key === h.status)))
  const idx = closed ? reached : Math.max(0, FLOW.findIndex(f => f.key === status))
  const steps = closed ? FLOW.slice(0, reached + 1) : FLOW
  const when = (k: Status) => { const h = history.find(x => x.status === k); return h ? shortDate(h.at) : '' }
  const rows = [...steps.map((s, i) => ({ key: s.key as string, label: s.label, state: closed || i < idx || (status === 'accepted' && i === idx) ? 'done' : i === idx ? 'current' : 'todo', date: when(s.key) })),
    ...(closed ? [{ key: status as string, label: status === 'rejected' ? 'Not selected' : 'Withdrawn', state: 'closed', date: when(status) }] : [])]
  return (
    <ol className="grid gap-0" aria-label={t('Application progress')}>
      {rows.map((r, i) => (
        <li key={r.key} className="flex gap-3" aria-current={r.state === 'current' ? 'step' : undefined}>
          <div className="flex flex-col items-center">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${r.state === 'done' ? 'bg-mintfill text-white' : r.state === 'current' ? 'bg-brand text-white ring-4 ring-brand/20' : r.state === 'closed' ? 'bg-redfill text-white' : 'bg-slate-200 text-muted dark:bg-slate-700'}`}>
              {r.state === 'done' ? <Check size={14} /> : r.state === 'closed' ? <X size={14} /> : i + 1}</span>
            {i < rows.length - 1 && <span className={`h-6 w-0.5 ${r.state === 'done' ? 'bg-mint' : 'bg-slate-200 dark:bg-slate-700'}`} />}
          </div>
          <div className="pb-1 pt-0.5"><span className={`text-sm ${r.state === 'current' ? 'font-bold' : r.state === 'todo' ? 'text-muted' : ''}`}>{r.label}</span>{r.date && <span className="ml-2 text-xs text-muted">{r.date}</span>}</div>
        </li>
      ))}
    </ol>
  )
}
