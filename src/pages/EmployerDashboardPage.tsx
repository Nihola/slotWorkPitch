import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { applicationService } from '../services/applicationService'
import { jobService } from '../services/jobService'
import { calculateMatch } from '../utils/matching'
import { greeting, shortDate } from '../utils/time'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import type { Application, Job } from '../types'
import { t } from '../i18n'

const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131839]'
export default function EmployerDashboardPage() {
  const { session } = useAuth()
  const user = session!.user
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [apps, setApps] = useState<Application[] | null>(null)
  const [error, setError] = useState(false)
  const load = () => { setError(false); Promise.all([jobService.getEmployerJobs().then(setJobs), applicationService.listForEmployer().then(setApps)]).catch(() => setError(true)) }
  useEffect(load, [])  
  const ready = jobs !== null && apps !== null
  const matchOf = (a: Application) => { const j = jobs?.find(x => x.id === a.jobId); return j ? calculateMatch(j, a.candidate).overall : 0 }
  const live = jobs?.filter(j => j.moderation === 'approved') ?? []
  const waiting = jobs?.filter(j => j.moderation === 'pending' || j.moderation === 'changes_requested').length ?? 0
  const returned = jobs?.filter(j => j.moderation === 'changes_requested' || j.moderation === 'rejected').length ?? 0
  const open = apps?.filter(a => a.status === 'submitted').length ?? 0
  return (
    <div className="grid gap-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold tracking-tight">{greeting()}, {user.name}</h1><p className="mt-1 text-muted">{t("Here's how your hiring is going.")}</p></div>
        <Link to="/employer/jobs/new" className="rounded-xl bg-gradient-to-br from-brand to-violet px-5 py-3 font-bold text-white">{t('Post a job')}</Link></div>
      {error && <div className="rounded-2xl border p-6 text-center"><p className="font-bold">{t('Something went wrong.')}</p><p className="text-muted">{t("We couldn't load your dashboard. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('Active jobs')} value={ready ? live.length : '…'} to="/employer/jobs" />
        <StatCard label={t('Applications')} value={ready ? apps!.length : '…'} hint={ready && open ? `${open} new` : undefined} to="/employer/applications" />
        <StatCard label={t('Strong matches')} value={ready ? apps!.filter(a => matchOf(a) >= 80).length : '…'} hint={t('80%+ match')} to="/employer/applications" />
        <StatCard label={t('Positions filled')} value={ready ? apps!.filter(a => a.status === 'accepted').length : '…'} />
      </div>
      {returned > 0 && <Link to="/employer/jobs" className="rounded-2xl bg-sky-500/10 p-4 text-sm font-semibold">{returned} {t('job')}{returned > 1 ? t('s need') : t(' needs')} {t("your attention. Review the moderator's note →")}</Link>}
      {waiting > 0 && returned === 0 && <p className="rounded-2xl bg-amber-500/10 p-4 text-sm font-semibold">{waiting} {t('job')}{waiting > 1 ? t('s are') : t(' is')} {t('waiting for moderator review. They go live once approved.')}</p>}
      <section aria-labelledby="aj-h" className="grid gap-3"><h2 id="aj-h" className="text-xl font-extrabold">{t('Active jobs')}</h2>
        {!ready && !error && <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />}
        {ready && live.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"><p className="font-bold">{t('You have no live jobs yet.')}</p><p className="text-muted">{t("Post a job and we'll find people whose schedules fit.")}</p><Link to="/employer/jobs/new" className="mt-2 inline-block font-bold text-brandfg">{t('Post a job')}</Link></div>}
        <ul className="grid gap-3">{(ready ? live : []).map(j => { const ja = (apps ?? []).filter(a => a.jobId === j.id); const avg = ja.length ? Math.round(ja.reduce((n, a) => n + matchOf(a), 0) / ja.length) : 0; return (
          <li key={j.id} className={`${card} flex flex-wrap items-center gap-3`}><div className="min-w-0 flex-1"><b className="block truncate">{j.title}</b><span className="text-sm text-muted">{ja.length} {t('application')}{ja.length === 1 ? '' : t('s')}{ja.length > 0 && ` · ${avg}% average candidate match`}</span></div>
            <Link to={`/employer/jobs/${j.id}`} className="text-sm font-bold text-brandfg">{t('Shift coverage')}</Link><Link to={`/employer/applications?job=${j.id}`} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">{t('View candidates')}</Link></li>) })}</ul></section>
      <section aria-labelledby="ra-h" className="grid gap-3"><div className="flex items-end justify-between"><h2 id="ra-h" className="text-xl font-extrabold">{t('Recent applications')}</h2><Link to="/employer/applications" className="text-sm font-bold text-brandfg">{t('View all')}</Link></div>
        {ready && apps!.length === 0 && <p className="text-muted">{t('Applications will show up here as soon as candidates apply.')}</p>}
        <ul className="grid gap-2">{apps?.slice(0, 4).map(a => <li key={a.id}><Link to="/employer/applications" className={`${card} flex flex-wrap items-center gap-3 hover:border-brand`}><span className="min-w-0 flex-1"><b className="block truncate">{a.candidate.name}</b><span className="text-sm text-muted">{a.jobTitle} · {shortDate(a.createdAt)}</span></span><StatusBadge status={a.status} /></Link></li>)}</ul></section>
    </div>
  )
}
