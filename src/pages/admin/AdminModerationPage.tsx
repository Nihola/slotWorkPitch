import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { moderationService } from '../../services/moderationService'
import RiskBadge from '../../components/RiskBadge'
import VerificationBadge from '../../components/VerificationBadge'
import { ACTION_LABEL, card, fmtDate } from './ui'
import type { Job, ModerationEntry } from '../../types'
import type { Risk, RiskLevel } from '../../utils/risk'
import { t } from '../../i18n'

type Tab = 'pending' | 'reviewed'
export default function AdminModerationPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [queue, setQueue] = useState<{ job: Job; risk: Risk }[] | null>(null)
  const [reviewed, setReviewed] = useState<ModerationEntry[] | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(() => { setError(false); Promise.all([moderationService.getQueue().then(setQueue), moderationService.getReviewed().then(setReviewed)]).catch(() => setError(true)) }, [])
  useEffect(load, [load])

  const shown = queue?.filter(q => filter === 'all' || q.risk.level === filter) ?? []
  const count = (l: RiskLevel) => queue?.filter(q => q.risk.level === l).length ?? 0
  const tabCls = (on: boolean) => `rounded-xl px-4 py-2 text-sm font-bold ${on ? 'bg-violet/25 text-white' : 'text-slate-400 hover:bg-white/5'}`
  return (
    <div className="grid gap-5">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Moderation queue')}</h1><p className="text-slate-400">{t('Riskiest listings first. Every job is reviewed before seekers can see it.')}</p></div>
      <div role="tablist" aria-label={t('Queue view')} className="flex gap-2">
        <button role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')} className={tabCls(tab === 'pending')}>{t('Pending')}{queue ? ` (${queue.length})` : ''}</button>
        <button role="tab" aria-selected={tab === 'reviewed'} onClick={() => setTab('reviewed')} className={tabCls(tab === 'reviewed')}>{t('Reviewed')}</button>
      </div>
      {error && <div className={`${card} text-center`}><p className="font-bold">{t('Something went wrong.')}</p><p className="text-slate-400">{t("We couldn't load the queue. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!error && tab === 'pending' && (<>
        <div role="group" aria-label={t('Filter by risk')} className="flex flex-wrap gap-2">{(['all', 'high', 'medium', 'low'] as const).map(l => (
          <button key={l} aria-pressed={filter === l} onClick={() => setFilter(l)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold capitalize ${filter === l ? 'border-cyan-400 bg-cyan-400/10 text-cyanfg' : 'border-white/15 text-slate-300'}`}>{l === 'all' ? `All${queue ? ` (${queue.length})` : ''}` : `${l} (${count(l)})`}</button>))}</div>
        {queue === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}
        {queue && shown.length === 0 && <div className={`${card} border-dashed text-center`}><p className="font-bold">{queue.length === 0 ? t('Nothing is waiting for review.') : t('No jobs match this filter.')}</p><p className="text-slate-400">{t('New submissions will appear here.')}</p></div>}
        <ul className="grid gap-3">{shown.map(({ job, risk }) => (
          <li key={job.id} className={`${card} grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center ${risk.level === 'high' ? 'border-l-4 border-l-red-500' : ''}`}>
            <div className="min-w-0"><h2 className="truncate font-bold"><Link to={`/admin/moderation/${job.id}`} className="hover:underline">{job.title}</Link></h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">{job.company}<VerificationBadge level={job.verification} /><span>{t('Submitted')} {fmtDate(job.postedAt)}</span></p></div>
            <div className="flex flex-wrap items-center gap-3"><RiskBadge level={risk.level} /><span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amberfg">{t('Pending')}</span>
              <Link to={`/admin/moderation/${job.id}`} aria-label={`Review ${job.title}`} className="rounded-xl bg-gradient-to-br from-brand to-violet px-4 py-2 text-sm font-bold text-white">{t('Review')}</Link></div>
          </li>))}</ul>
      </>)}
      {!error && tab === 'reviewed' && (reviewed === null ? <div className="h-24 animate-pulse rounded-2xl bg-white/5" /> : reviewed.length === 0 ? <div className={`${card} border-dashed text-center`}><p className="font-bold">{t('No decisions yet.')}</p><p className="text-slate-400">{t('Approved, rejected, and returned jobs will be listed here.')}</p></div> : (
        <ul className="grid gap-3">{reviewed.map(e => (
          <li key={e.id} className={card}><p className="font-bold"><Link to={`/admin/moderation/${e.jobId}`} className="hover:underline">{e.jobTitle}</Link> <span className="ml-1 text-sm font-semibold text-cyanfg">{ACTION_LABEL[e.action]}</span></p>
            {e.reason && <p className="mt-1 text-sm text-slate-300">“{e.reason}”</p>}<p className="mt-1 text-xs text-muted">{e.actorName} · {fmtDate(e.at)}</p></li>))}</ul>))}
    </div>
  )
}
