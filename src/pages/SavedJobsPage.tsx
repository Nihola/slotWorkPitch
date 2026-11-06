import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useJobs } from '../hooks/useJobs'
import { useSaved } from '../hooks/useSaved'
import { useSeeker } from '../context/SeekerContext'
import { matchingService } from '../services/matchingService'
import JobCard from '../components/JobCard'
import { t } from '../i18n'

export default function SavedJobsPage() {
  const { jobs, loading, error, reload } = useJobs()
  const { seeker } = useSeeker()
  const { ids, isSaved, toggle } = useSaved()
  const saved = jobs.filter(j => ids.includes(j.id))
  return (
    <div className="grid gap-5 pb-16">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Saved jobs')}</h1><p className="text-muted">{t('Jobs you want to come back to.')}</p></div>
      {loading && Array.from({ length: 2 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      {error && <div className="rounded-2xl border p-6 text-center"><p className="font-bold">{t('Something went wrong.')}</p><p className="text-muted">{t("We couldn't load your saved jobs. Please try again.")}</p><button onClick={reload} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!loading && !error && saved.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><Bookmark className="mx-auto text-slate-400" /><p className="mt-2 font-bold">{t("You haven't saved any opportunities yet.")}</p><p className="text-muted">{t('Tap the bookmark on a job to keep it here.')}</p><Link to="/jobs" className="mt-3 inline-block rounded-xl bg-brand px-5 py-2.5 font-bold text-white">{t('Explore jobs')}</Link></div>}
      {saved.length > 0 && <h2 className="sr-only">{t('Your saved jobs')}</h2>}
      <div className="grid gap-3">{saved.map(job => <JobCard key={job.id} job={job} match={matchingService.calculateMatch(job, seeker)} saved={isSaved(job.id)} onToggleSave={() => toggle(job.id)} />)}</div>
      {ids.length > saved.length && !loading && <p className="text-sm text-muted">{ids.length - saved.length} {t('saved job')}{ids.length - saved.length > 1 ? t('s are') : t(' is')} {t('no longer available.')}</p>}
    </div>
  )
}
