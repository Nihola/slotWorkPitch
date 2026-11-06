import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Bookmark, Clock, Flag, MapPin, Wallet } from 'lucide-react'
import VerificationBadge from '../components/VerificationBadge'
import ReportModal from '../components/ReportModal'
import { jobService } from '../services/jobService'
import { applicationService } from '../services/applicationService'
import { useSaved } from '../hooks/useSaved'
import { matchingService } from '../services/matchingService'
import { useSeeker } from '../context/SeekerContext'
import MatchScore from '../components/MatchScore'
import ScheduleTimeline from '../components/ScheduleTimeline'
import ApplyModal from '../components/ApplyModal'
import type { Application, Job } from '../types'
import { t } from '../i18n'

const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]

export default function JobDetailPage() {
  const { id = '' } = useParams()
  const { seeker } = useSeeker()
  const [job, setJob] = useState<Job | null | undefined>(undefined)
  const { isSaved, toggle } = useSaved()
  const [existing, setExisting] = useState<Application | null>(null)
  useEffect(() => { applicationService.findActive(id).then(setExisting).catch(() => setExisting(null)) }, [id])
  const [applying, setApplying] = useState(false)
  const [reporting, setReporting] = useState(false)
  useEffect(() => { jobService.getJobById(id).then(j => setJob(j ?? null)).catch(() => setJob(null)) }, [id])

  if (job === undefined) return <div className="grid gap-4"><div className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></div>
  if (job === null) return <div className="rounded-2xl border p-8 text-center"><p className="font-bold">{t("We couldn't find that job.")}</p><Link to="/jobs" className="mt-3 inline-block font-bold text-brandfg">{t('Back to jobs')}</Link></div>

  const m = matchingService.calculateMatch(job, seeker)
  const { days, startHour, endHour } = job.schedule
  const total = days.length * (endHour - startHour)
  const covered = total - m.uncoveredHours
  const pay = job.salaryMin === job.salaryMax ? `$${job.salaryMin}` : `$${job.salaryMin}–${job.salaryMax}`
  const card = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'

  return (
    <div className="grid gap-5 pb-24">
      <Link to="/jobs" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft size={16} />{t('All jobs')}</Link>
      <header className={`${card} flex flex-wrap items-start gap-4`}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-violet text-xl font-extrabold text-white">{job.company[0]}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{job.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-muted">{job.company}
            <VerificationBadge level={job.verification} /></p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{job.district ? `${job.district}, ${job.city}` : job.city}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet size={15} />{pay} / {job.salaryPeriod}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} />{job.type}</span></p>
        </div>
        <MatchScore value={m.overall} size={72} showLabel />
        <button onClick={() => setReporting(true)} aria-label={t('Report this job')} className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-redfg"><Flag size={14} />{t('Report')}</button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className={card}>
          <h2 className="text-xl font-extrabold">{t('Schedule')}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">{days.map(d => DAYS[d]).join(', ')} · {startHour}:00–{endHour}:00</p>
          <ScheduleTimeline job={job} availability={seeker.availability} />
          <div className="mt-5 rounded-2xl bg-lav p-4 dark:bg-slate-800/60">
            <p className="text-3xl font-extrabold">{m.schedule}% <span className="text-base font-semibold text-muted">{t('schedule compatibility')}</span></p>
            <p className="mt-1 text-sm">{m.schedule === 100 ? t('You can cover every required hour.') : m.schedule === 0 ? t('None of the required hours match your availability yet.') : `You can cover ${covered} of ${total} required hours. ${m.uncoveredHours} fall outside your availability.`}</p>
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className={card}>
            <h2 className="text-xl font-extrabold">{t('Why this match')}</h2>
            <ul className="mt-3 grid gap-3 text-sm">
              {([['Schedule', m.schedule], ['Skills', m.skills], ['Location', m.location], ['Experience', m.experience], ['Preferences', m.preferences]] as const).map(([k, v]) => (
                <li key={k}><div className="flex justify-between font-semibold"><span>{k}</span><span>{v}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-gradient-to-r from-brand to-violet transition-all duration-700" style={{ width: `${v}%` }} /></div></li>
              ))}
            </ul>
          </section>
          <section className={card}>
            <h2 className="text-xl font-extrabold">{t('Skills')}</h2>
            <p className="mt-3 flex flex-wrap gap-2">{job.skills.map(s => <span key={s} className="rounded-full bg-lav px-3 py-1 text-xs font-bold dark:bg-slate-800">{s}</span>)}</p>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-700 dark:bg-[#0A0E26]/95">
        <div className="mx-auto flex max-w-5xl gap-3 px-2">
          <button onClick={() => toggle(job.id)} aria-pressed={isSaved(job.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><Bookmark size={16} fill={isSaved(job.id) ? 'currentColor' : 'none'} />{isSaved(job.id) ? t('Saved') : t('Save job')}</button>
          {existing
            ? <Link to={`/applications/${existing.id}`} className="flex-1 rounded-xl bg-mint/15 py-3 text-center font-bold text-mintfg">{t('Applied · View your application')}</Link>
            : <button onClick={() => setApplying(true)} className="flex-1 rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white">{t('Apply now')}</button>}
        </div>
      </div>
      {applying && <ApplyModal job={job} onClose={() => { setApplying(false); applicationService.findActive(job.id).then(setExisting).catch(() => undefined) }} />}
      {reporting && <ReportModal job={job} onClose={() => setReporting(false)} />}
    </div>
  )
}
