import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSeeker } from '../context/SeekerContext'
import { useJobs } from '../hooks/useJobs'
import { useSaved } from '../hooks/useSaved'
import { applicationService } from '../services/applicationService'
import { matchingService } from '../services/matchingService'
import { profileStrength } from '../features/onboarding/draft'
import { greeting, shortDate } from '../utils/time'
import JobCard from '../components/JobCard'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import type { Application } from '../types'
import { t } from '../i18n'

export default function DashboardPage() {
  const { session } = useAuth()
  const { seeker } = useSeeker()
  const { jobs, loading } = useJobs()
  const { isSaved, toggle } = useSaved()
  const [apps, setApps] = useState<Application[] | null>(null)
  useEffect(() => { applicationService.listForSeeker().then(setApps).catch(() => setApps([])) }, [])
  const ranked = useMemo(() => jobs.map(job => ({ job, match: matchingService.calculateMatch(job, seeker) })).sort((a, b) => b.match.overall - a.match.overall), [jobs, seeker])
  const strong = ranked.filter(r => r.match.overall >= 70).length
  const interviews = apps?.filter(a => a.status === 'interview').length ?? 0
  const strength = session?.profile ? profileStrength(session.profile) : 0
  const first = session!.user.name.split(' ')[0]
  return (
    <div className="grid gap-6 pb-16">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{greeting()}, {first} 👋</h1><p className="mt-1 text-muted">{t('Here are opportunities that fit your schedule.')}</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('Recommended jobs')} value={loading ? '…' : strong} hint={t('70%+ match')} to="/jobs" />
        <StatCard label={t('Applications')} value={apps ? apps.length : '…'} to="/applications" />
        <StatCard label={t('Interviews')} value={apps ? interviews : '…'} to="/applications" />
        <StatCard label={t('Profile strength')} value={`${strength}%`} hint={strength < 100 ? t('Improve it in your profile') : t('Complete')} to="/profile" />
      </div>
      <section aria-labelledby="best-h" className="grid gap-3">
        <div className="flex items-end justify-between"><h2 id="best-h" className="text-xl font-extrabold">{t('Best matches')}</h2><Link to="/jobs" className="text-sm font-bold text-brandfg">{t('See all jobs')}</Link></div>
        {loading && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        {ranked.slice(0, 3).map(({ job, match }) => <JobCard key={job.id} job={job} match={match} saved={isSaved(job.id)} onToggleSave={() => toggle(job.id)} />)}
      </section>
      <section aria-labelledby="apps-h" className="grid gap-3">
        <div className="flex items-end justify-between"><h2 id="apps-h" className="text-xl font-extrabold">{t('Your applications')}</h2><Link to="/applications" className="text-sm font-bold text-brandfg">{t('View all')}</Link></div>
        {apps === null ? <div className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" /> : apps.length === 0
          ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-600"><p className="font-bold">{t("You haven't applied to anything yet.")}</p><Link to="/jobs" className="mt-2 inline-block font-bold text-brandfg">{t('Find jobs')}</Link></div>
          : <ul className="grid gap-2">{apps.slice(0, 3).map(a => <li key={a.id}><Link to={`/applications/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand dark:border-slate-700 dark:bg-[#131839]"><span className="min-w-0 flex-1"><b className="block truncate">{a.jobTitle}</b><span className="text-sm text-muted">{a.company} {t('· applied')} {shortDate(a.createdAt)}</span></span><StatusBadge status={a.status} /></Link></li>)}</ul>}
      </section>
    </div>
  )
}
