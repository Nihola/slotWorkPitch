import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareWarning } from 'lucide-react'
import { jobService } from '../services/jobService'
import type { Job } from '../types'
import { t } from '../i18n'

const STATUS: Record<Job['moderation'], [string, string]> = {
  pending: [t('Pending review'), 'bg-amber-500/15 text-amberfg'], approved: [t('Live'), 'bg-mint/15 text-mintfg'],
  rejected: [t('Rejected'), 'bg-red-500/15 text-redfg'], changes_requested: [t('Changes requested'), 'bg-sky-500/15 text-skyfg'],
}
export default function EmployerJobsPage() {
    const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(() => { setError(false); setJobs(null); jobService.getEmployerJobs().then(setJobs).catch(() => setError(true)) }, [])
  useEffect(load, [load])
  return (
    <div className="grid gap-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold tracking-tight">{t('Your jobs')}</h1><p className="text-muted">{t('Track each listing from review to live.')}</p></div>
        <Link to="/employer/jobs/new" className="rounded-xl bg-gradient-to-br from-brand to-violet px-5 py-3 font-bold text-white">{t('Post a job')}</Link></div>
      {error && <div className="rounded-2xl border p-8 text-center"><p className="font-bold">{t('Something went wrong.')}</p><p className="text-muted">{t("We couldn't load your jobs. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!error && jobs === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      {jobs?.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><p className="font-bold">{t("You haven't posted any jobs yet.")}</p><p className="text-muted">{t("Post your first job and we'll find people whose schedules fit.")}</p><Link to="/employer/jobs/new" className="mt-4 inline-block font-bold text-brandfg">{t('Post a job')}</Link></div>}
      <ul className="grid gap-3">{jobs?.map(j => { const [label, cls] = STATUS[j.moderation]; const returned = j.moderation === 'changes_requested' || j.moderation === 'rejected'; return (
        <li key={j.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131839]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1"><h2 className="font-bold">{j.title}</h2><p className="text-sm text-muted">{j.positions ?? 1} {t('position')}{(j.positions ?? 1) > 1 ? t('s') : ''} {t('· posted')} {j.postedAt}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>{label}</span>
            {j.moderation === 'approved' && <Link to={`/employer/jobs/${j.id}`} className="text-sm font-bold text-brandfg">{t('View coverage')}</Link>}
            {returned && <Link to={`/employer/jobs/${j.id}/edit`} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">{t('Edit and resubmit')}</Link>}
          </div>
          {returned && j.moderationNote && <p className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60"><MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-skyfg" aria-hidden="true" /><span><b>{t('Moderator note:')}</b> {j.moderationNote}</span></p>}
        </li>) })}</ul>
    </div>
  )
}
