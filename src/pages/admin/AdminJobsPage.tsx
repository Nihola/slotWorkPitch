import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { jobService } from '../../services/jobService'
import VerificationBadge from '../../components/VerificationBadge'
import { STATUS_CLS, STATUS_LABEL, card, fmtDate } from './ui'
import type { Job, ModerationStatus } from '../../types'
import { t } from '../../i18n'

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [status, setStatus] = useState<ModerationStatus | 'all'>('all')
  const [error, setError] = useState(false)
  useEffect(() => { jobService.getAllJobs().then(setJobs).catch(() => setError(true)) }, [])
  const shown = jobs?.filter(j => status === 'all' || j.moderation === status) ?? []
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold tracking-tight">{t('All jobs')}</h1><p className="text-slate-400">{t('Every listing and where it stands.')}</p></div>
        <label className="text-sm font-bold">{t('Status')} <select value={status} onChange={e => setStatus(e.target.value as ModerationStatus | 'all')} className="ml-2 rounded-xl border border-white/15 bg-[#0F1430] px-3 py-2">
          <option value="all">{t('All')}</option>{(Object.keys(STATUS_LABEL) as ModerationStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label></div>
      {error && <div className={`${card} text-center`}><p className="font-bold">{t('Something went wrong.')}</p><p className="text-slate-400">{t("We couldn't load the jobs. Please try again.")}</p></div>}
      {!error && jobs === null && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}
      {jobs && shown.length === 0 && <div className={`${card} border-dashed text-center`}><p className="font-bold">{t('No jobs with this status.')}</p></div>}
      <ul className="grid gap-2">{shown.map(j => (
        <li key={j.id} className="grid gap-2 rounded-2xl border border-white/10 bg-[#0F1430] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div className="min-w-0"><Link to={`/admin/moderation/${j.id}`} className="block truncate font-bold hover:underline">{j.title}</Link><p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-400">{j.company}<VerificationBadge level={j.verification} /><span>{j.type} · {fmtDate(j.postedAt)}</span></p></div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLS[j.moderation]}`}>{STATUS_LABEL[j.moderation]}</span>
          <Link to={`/admin/moderation/${j.id}`} className="text-sm font-bold text-cyanfg">{j.moderation === 'pending' ? t('Review') : t('View')}</Link>
        </li>))}</ul>
    </div>
  )
}
