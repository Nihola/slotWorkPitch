import { computeCoverage, isFreeAt } from '../utils/coverage'
import type { Job, JobSeeker } from '../types'
import { t } from '../i18n'
const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
export const PERSON_COLORS = ['bg-brand', 'bg-violet', 'bg-cyan-500', 'bg-amber-500', 'bg-pink-500']
const dim = (c: string) => `${c}/25`
interface Props { job: Job; people: JobSeeker[]; day: number; from?: number; to?: number }
export default function CoverageTimeline({ job, people, day, from = 8, to = 22 }: Props) {
  const hours = Array.from({ length: to - from }, (_, i) => from + i)
  const { startHour: s, endHour: e } = job.schedule
  const gaps = computeCoverage({ ...job, schedule: { ...job.schedule, days: [day] } }, people).perDay[0].gaps
  const inGap = (h: number) => gaps.some(([a, b]) => h >= a && h < b)
  const cols = { gridTemplateColumns: `repeat(${hours.length}, minmax(0,1fr))` }
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable so keyboard users can scroll it (WCAG 2.1.1)
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`Coverage on ${DAYS[day]}`}>
      <div className="grid min-w-[520px] gap-2" style={{ gridTemplateColumns: '92px 1fr' }}>
        <span />
        <div className="grid gap-[2px] text-[10px] text-muted" style={cols}>{hours.map(h => <span key={h} className="text-center">{h % 2 === 0 ? h : ''}</span>)}</div>
        <span className="self-center text-xs font-bold">{t('Required')}</span>
        <div className="grid gap-[2px]" style={cols}>{hours.map(h => <span key={h} className={`h-7 rounded ${h >= s && h < e ? 'border-2 border-dashed border-violet' : 'bg-slate-100 dark:bg-slate-800'}`} />)}</div>
        {people.map((p, i) => {
          const color = PERSON_COLORS[i % PERSON_COLORS.length]
          return (
            <div key={p.id} className="contents">
              <span className="self-center truncate text-xs font-bold">{p.name}</span>
              <div className="grid gap-[2px]" style={cols}>{hours.map(h => {
                const free = isFreeAt(p.availability, day, h), req = h >= s && h < e
                return <span key={h} className={`h-7 rounded transition-colors ${free ? (req ? color : dim(color)) : 'bg-slate-100 dark:bg-slate-800'}`} />
              })}</div>
            </div>
          )
        })}
        <span className="self-center text-xs font-bold text-redfg">{t('Gap')}</span>
        <div className="grid gap-[2px]" style={cols}>{hours.map(h => (
          <span key={h} className={`h-7 rounded ${inGap(h) ? 'border border-red-500 bg-[repeating-linear-gradient(45deg,rgba(229,72,77,.35)_0_5px,transparent_5px_10px)]' : 'bg-slate-100 dark:bg-slate-800'}`} />
        ))}</div>
      </div>
    </div>
  )
}
