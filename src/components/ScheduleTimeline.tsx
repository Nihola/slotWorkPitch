import type { Availability, Job } from '../types'
import { t } from '../i18n'
const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
interface Props { job: Job; availability: Availability[]; from?: number; to?: number }
/** One row per working day: green = hours you cover, red = required hours you can't. */
export default function ScheduleTimeline({ job, availability, from = 8, to = 22 }: Props) {
  const hours = Array.from({ length: to - from }, (_, i) => from + i)
  const have = new Set<string>()
  availability.forEach(a => { for (let h = a.startHour; h < a.endHour; h++) have.add(`${a.dayOfWeek}-${h}`) })
  const { startHour, endHour } = job.schedule
  return (
    <div className="grid gap-2" role="group" aria-label={t('Schedule compared with your availability')}>
      <div className="grid items-center gap-[2px] text-[10px] text-muted" style={{ gridTemplateColumns: `36px repeat(${hours.length}, 1fr)` }}>
        <span />{hours.map(h => <span key={h} className="text-center">{h % 2 === 0 ? h : ''}</span>)}
      </div>
      {job.schedule.days.map(d => (
        <div key={d} className="grid items-center gap-[2px]" style={{ gridTemplateColumns: `36px repeat(${hours.length}, 1fr)` }}>
          <span className="text-xs font-bold">{DAYS[d]}</span>
          {hours.map(h => {
            const req = h >= startHour && h < endHour, ok = have.has(`${d}-${h}`)
            const cls = req ? (ok ? 'bg-mint' : 'bg-red-400/70') : ok ? 'bg-mint/25' : 'bg-slate-100 dark:bg-slate-800'
            return <span key={h} title={`${h}:00 ${req ? (ok ? 'covered' : 'not covered') : ''}`} className={`h-6 rounded ${cls}`} />
          })}
        </div>
      ))}
      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-mint" />{t("Required and you're free")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-red-400/70" />{t('Required, not in your availability')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-mint/25" />{t('Free, not needed')}</span>
      </div>
    </div>
  )
}
