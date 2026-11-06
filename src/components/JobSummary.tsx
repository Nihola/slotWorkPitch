import type { NewJob } from '../types'
import { t } from '../i18n'
const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
/** Read-only listing summary shared by the employer preview and the admin review. */
export default function JobSummary({ job: j }: { job: NewJob }) {
  const pay = j.salaryMin === j.salaryMax ? `$${j.salaryMin}` : `$${j.salaryMin}–${j.salaryMax}`
  const rows: [string, string][] = [
    ['Type', `${t(j.type)}${j.category ? ` · ${t(j.category)}` : ''}`], ['Positions', String(j.positions ?? 1)],
    ['Pay', `${pay} per ${j.salaryPeriod}${j.paymentFrequency ? `, paid ${j.paymentFrequency.toLowerCase()}` : ''}`],
    ['Where', j.workMode === 'remote' || j.city === 'Remote' ? 'Remote' : `${j.workMode ?? 'on-site'} · ${[j.address, j.district, j.city].filter(Boolean).join(', ')}`],
    ['Schedule', `${j.schedule.days.map(i => DAYS[i]).join(', ')} · ${hh(j.schedule.startHour)}–${hh(j.schedule.endHour)}${j.schedule.flexible ? ' (flexible)' : ''}`],
    ['Shifts', j.schedule.shifts.length ? j.schedule.shifts.map(s => `${s.label} ${hh(s.startHour)}–${hh(s.endHour)}`).join(', ') : 'None'],
    ['Skills', j.skills.join(', ') || 'None listed'], ['Experience', j.experience ?? 'Not specified'], ['Education', j.education ?? 'Not specified'], ['Languages', j.languages?.join(', ') || 'Not specified'],
  ]
  return (<div>
    <p className="whitespace-pre-line text-sm">{j.description || t('No description provided.')}</p>
    <dl className="mt-4 grid gap-2 text-sm">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[96px_1fr] gap-3 border-t border-slate-100 pt-2 dark:border-white/10"><dt className="font-bold">{k}</dt><dd className="text-slate-600 dark:text-slate-300">{v}</dd></div>)}</dl>
  </div>)
}
