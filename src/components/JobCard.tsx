import { Link } from 'react-router-dom'
import { Bookmark, Clock, MapPin, Wallet } from 'lucide-react'
import MatchScore from './MatchScore'
import VerificationBadge from './VerificationBadge'
import { shortDate } from '../utils/time'
import type { Job, MatchScore as Score } from '../types'
import { t } from '../i18n'

const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
interface Props { job: Job; match: Score; saved?: boolean; onToggleSave?: () => void }
export default function JobCard({ job, match, saved = false, onToggleSave }: Props) {
  const { days, startHour, endHour } = job.schedule
  const pay = job.salaryMin === job.salaryMax ? `$${job.salaryMin}` : `$${job.salaryMin}–${job.salaryMax}`
  return (
    <article className="relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand dark:border-slate-700 dark:bg-[#131839]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-violet font-extrabold text-white" aria-hidden="true">{job.company[0]}</div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold"><Link to={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{job.title}</Link></h3>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">{job.company}<VerificationBadge level={job.verification} /></p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden="true" />{job.district || job.city}</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{days.length > 1 ? `${DAYS[days[0]]}–${DAYS[days[days.length - 1]]}` : DAYS[days[0]]} {startHour}:00–{endHour}:00</span>
          <span className="inline-flex items-center gap-1"><Wallet size={14} aria-hidden="true" />{pay} / {job.salaryPeriod}</span></p>
        <p className="mt-1.5 flex flex-wrap gap-1.5"><span className="rounded-full bg-lav px-2.5 py-0.5 text-xs font-bold dark:bg-slate-800">{t(job.type)}</span>
          {job.skills.slice(0, 3).map(s => <span key={s} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs dark:border-slate-700">{s}</span>)}
          <span className="px-1 py-0.5 text-xs text-muted">{t('Posted')} {shortDate(job.postedAt)}</span></p>
        <p className="mt-1.5 text-xs font-semibold text-mintfg">{match.schedule === 100 ? t('✓ Schedule compatible') : `You cover ${match.schedule}% of the hours`}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {onToggleSave && <button type="button" onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} className="relative z-10 grid h-9 w-9 place-items-center rounded-lg border border-slate-200 hover:text-brandfg dark:border-slate-700"><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-brandfg' : ''} /></button>}
        <MatchScore value={match.overall} />
      </div>
    </article>
  )
}
