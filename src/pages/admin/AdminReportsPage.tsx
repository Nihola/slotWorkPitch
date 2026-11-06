import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobService } from '../../services/jobService'
import { REPORT_REASONS, reportService } from '../../services/reportService'
import { useToast } from '../../context/ToastContext'
import { btnGhost, card, fmtDate } from './ui'
import type { Job, Report } from '../../types'
import { t } from '../../i18n'

export default function AdminReportsPage() {
  const toast = useToast()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(() => { setError(false); Promise.all([reportService.list(), jobService.getAllJobs()]).then(([r, j]) => { setReports(r); setJobs(j) }).catch(() => setError(true)) }, [])
  useEffect(load, [load])
  const close = async (r: Report, status: 'resolved' | 'dismissed') => {
    try { await reportService.setStatus(r.id, status); toast(status === 'resolved' ? t('Report resolved') : t('Report dismissed')); load() }
    catch { toast(t("We couldn't update that report. Please try again.")) }
  }
  const shown = reports?.filter(r => !onlyOpen || r.status === 'open') ?? []
  const title = (id: string) => jobs.find(j => j.id === id)?.title ?? 'Removed job'
  const label = (r: Report) => REPORT_REASONS.find(x => x.id === r.reason)?.label ?? r.reason
  return (
    <div className="grid gap-5">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Reports')}</h1><p className="text-slate-400">{t("Reports from users raise a job's risk score until they are closed.")}</p></div>
      <div role="group" aria-label={t('Filter reports')} className="flex gap-2">{[['Open', true], ['All', false]].map(([l, v]) => <button key={String(l)} aria-pressed={onlyOpen === v} onClick={() => setOnlyOpen(v as boolean)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${onlyOpen === v ? 'border-cyan-400 bg-cyan-400/10 text-cyanfg' : 'border-white/15 text-slate-300'}`}>{l as string}</button>)}</div>
      {error && <div className={`${card} text-center`}><p className="font-bold">{t('Something went wrong.')}</p><p className="text-slate-400">{t("We couldn't load the reports. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!error && reports === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}
      {reports && shown.length === 0 && <div className={`${card} border-dashed text-center`}><p className="font-bold">{t('No')} {onlyOpen ? t('open ') : ''}{t('reports.')}</p><p className="text-slate-400">{t("You're all caught up.")}</p></div>}
      <ul className="grid gap-3">{shown.map(r => (
        <li key={r.id} className={card}>
          <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-extrabold text-redfg">{label(r)}</span>
            <Link to={`/admin/moderation/${r.targetId}`} className="font-bold hover:underline">{title(r.targetId)}</Link><span className="ml-auto text-xs text-muted">{fmtDate(r.createdAt)} · {r.status}</span></div>
          {r.details && <p className="mt-2 text-sm text-slate-300">“{r.details}”</p>}
          {r.status === 'open' && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => close(r, 'resolved')} aria-label={`Resolve report: ${label(r)} on ${title(r.targetId)}`} className={btnGhost}>{t('Resolve')}</button><button onClick={() => close(r, 'dismissed')} aria-label={`Dismiss report: ${label(r)} on ${title(r.targetId)}`} className={btnGhost}>{t('Dismiss')}</button></div>}
        </li>))}</ul>
    </div>
  )
}
