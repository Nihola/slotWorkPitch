import { Plus, Trash2 } from 'lucide-react'
import { TextField, SelectField, TextAreaField } from '../../components/TextField'
import SkillPicker from '../../components/SkillPicker'
import JobSummary from '../../components/JobSummary'
import { CATEGORIES, WORK_FROM, WORK_TO, buildJob, type Errors, type JobDraft } from './draft'
import type { Job, JobType, User } from '../../types'
import { t } from '../../i18n'

export interface StepProps { d: JobDraft; set: <K extends keyof JobDraft>(k: K, v: JobDraft[K]) => void; errors: Errors }
const DAYS = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')]
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`
const Err = ({ id, m }: { id: string; m?: string }) => (m ? <p id={id} role="alert" className="mt-2 text-xs font-semibold text-redfg">{m}</p> : null)
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

export function BasicsStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <TextField id="title" label={t('Job title')} value={d.title} onChange={e => set('title', e.target.value)} error={errors.title} />
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField id="category" label={t('Category')} value={d.category} onChange={e => set('category', e.target.value)} error={errors.category} options={CATEGORIES} />
      <SelectField id="type" label={t('Job type')} value={d.type} onChange={e => set('type', e.target.value as JobType)} error={errors.type} options={['part-time', 'full-time', 'shift-based', 'short-term', 'one-time', 'remote']} />
    </div>
    <TextAreaField id="description" label={t('Description')} hint={t('What will the person do? Keep it clear and honest.')} value={d.description} onChange={e => set('description', e.target.value)} error={errors.description} />
    <TextField id="positions" label={t('Number of positions')} type="number" min={1} inputMode="numeric" value={d.positions} onChange={e => set('positions', e.target.value)} error={errors.positions} />
  </div>)
}

const PERIODS: Job['salaryPeriod'][] = ['hour', 'day', 'month']
export function PayStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <div role="radiogroup" aria-label={t('Pay is per')} className="inline-flex w-fit rounded-xl border border-slate-300 p-1 dark:border-slate-600">{PERIODS.map(p => (
      <button key={p} type="button" role="radio" aria-checked={d.salaryPeriod === p} onClick={() => set('salaryPeriod', p)} className={`rounded-lg px-4 py-1.5 text-sm font-bold ${d.salaryPeriod === p ? 'bg-brand text-white' : ''}`}>{t('per')} {p}</button>))}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField id="salaryMin" label={t('Pay (USD)')} type="number" min={0} inputMode="decimal" value={d.salaryMin} onChange={e => set('salaryMin', e.target.value)} error={errors.salaryMin} />
      <TextField id="salaryMax" label={t('Up to (optional)')} type="number" min={0} inputMode="decimal" value={d.salaryMax} onChange={e => set('salaryMax', e.target.value)} error={errors.salaryMax} hint={t('Leave blank for a fixed amount.')} />
    </div>
    <SelectField id="freq" label={t('Payment frequency')} value={d.paymentFrequency} onChange={e => set('paymentFrequency', e.target.value)} error={errors.paymentFrequency} options={['Weekly', 'Every two weeks', 'Monthly', 'Per shift', 'On completion']} />
  </div>)
}

const MODES: { id: NonNullable<Job['workMode']>; label: string; text: string }[] = [
  { id: 'on-site', label: t('On-site'), text: t('At your location') }, { id: 'hybrid', label: t('Hybrid'), text: t('Part on-site, part remote') }, { id: 'remote', label: t('Remote'), text: t('From anywhere') },
]
export function LocationStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <fieldset><legend className="text-sm font-bold">{t('Where does the work happen?')}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">{MODES.map(m => (
        <label key={m.id} className={`cursor-pointer rounded-2xl border-2 p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${d.workMode === m.id ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'}`}>
          <input type="radio" name="mode" className="sr-only" checked={d.workMode === m.id} onChange={() => set('workMode', m.id)} /><b>{m.label}</b><span className="block text-sm text-muted">{m.text}</span></label>))}</div>
      <Err id="mode-err" m={errors.workMode} /></fieldset>
    {d.workMode && d.workMode !== 'remote' && (<>
      <SelectField id="city" label={t('City')} value={d.city} onChange={e => set('city', e.target.value)} error={errors.city} options={['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan', 'Fergana']} />
      <TextField id="district" label={t('District (optional)')} value={d.district} onChange={e => set('district', e.target.value)} />
      <TextField id="address" label={t('Address')} value={d.address} onChange={e => set('address', e.target.value)} error={errors.address} />
    </>)}
  </div>)
}

const LANGS = ['Uzbek', 'Russian', 'English']
export function RequirementsStep({ d, set, errors }: StepProps) {
  const toggleLang = (l: string) => set('languages', d.languages.includes(l) ? d.languages.filter(x => x !== l) : [...d.languages, l])
  return (<div className="grid gap-5">
    <div><p className="mb-2 text-sm font-bold">{t('Skills (optional)')}</p>
      <SkillPicker value={d.skills} onChange={v => set('skills', v)} suggestions={['English', 'Teaching', 'Service', 'Customer support', 'Excel', 'Typing', 'Coffee', 'Events', 'Russian', 'Sales', 'Driving', 'Cooking']} error={errors.skills} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField id="experience" label={t('Experience (optional)')} value={d.experience} onChange={e => set('experience', e.target.value)} options={['No experience needed', 'Under 1 year', '1–3 years', '3+ years']} />
      <SelectField id="education" label={t('Education (optional)')} value={d.education} onChange={e => set('education', e.target.value)} options={['Not required', 'High school', 'Vocational / college', 'Bachelor degree']} />
    </div>
    <div role="group" aria-label={t('Languages')}><p className="mb-2 text-sm font-bold">{t('Languages (optional)')}</p>
      <div className="flex flex-wrap gap-2">{LANGS.map(l => <button key={l} type="button" aria-pressed={d.languages.includes(l)} onClick={() => toggleLang(l)} className={chip(d.languages.includes(l))}>{l}</button>)}</div></div>
  </div>)
}

function HourSelect({ label, value, from, to, onChange }: { label: string; value: number; from: number; to: number; onChange: (h: number) => void }) {
  return (<div><label className="text-sm font-bold">{label}
    <select value={value} onChange={e => onChange(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm dark:border-slate-600">
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map(h => <option key={h} value={h} className="text-ink">{hourLabel(h)}</option>)}</select></label></div>)
}
export function ScheduleStep({ d, set, errors }: StepProps) {
  const toggleDay = (i: number) => set('days', d.days.includes(i) ? d.days.filter(x => x !== i) : [...d.days, i])
  const upd = (id: string, patch: Partial<JobDraft['shifts'][number]>) => set('shifts', d.shifts.map(s => (s.id === id ? { ...s, ...patch } : s)))
  const addShift = () => set('shifts', [...d.shifts, { id: `sh-${Date.now().toString(36)}${d.shifts.length}`, label: '', startHour: d.startHour, endHour: Math.min(d.endHour, d.startHour + 4) }])
  return (<div className="grid gap-5">
    <div role="group" aria-label={t('Working days')}><p className="mb-2 text-sm font-bold">{t('Working days')}</p>
      <div className="flex flex-wrap gap-2">{DAYS.map((l, i) => <button key={l} type="button" aria-pressed={d.days.includes(i)} onClick={() => toggleDay(i)} className={chip(d.days.includes(i))}>{l}</button>)}</div><Err id="days-err" m={errors.days} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <HourSelect label={t('Starts at')} value={d.startHour} from={WORK_FROM} to={WORK_TO - 1} onChange={h => set('startHour', h)} />
      <HourSelect label={t('Ends at')} value={d.endHour} from={WORK_FROM + 1} to={WORK_TO} onChange={h => set('endHour', h)} />
    </div>
    <Err id="hours-err" m={errors.hours} />
    <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={d.flexible} onChange={e => set('flexible', e.target.checked)} className="h-5 w-5 accent-brand" />{t('Hours can be adjusted for the right person')}</label>
    <div><p className="text-sm font-bold">{t('Shifts (optional)')}</p><p className="mb-2 text-xs text-muted">{t('Split the day so several people can cover it together.')}</p>
      <div className="grid gap-3">{d.shifts.map((s, i) => (
        <div key={s.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
            <TextField id={`shift-label-${i}`} label={`Shift ${i + 1} name`} value={s.label} onChange={e => upd(s.id, { label: e.target.value })} />
            <HourSelect label={t('From')} value={s.startHour} from={WORK_FROM} to={WORK_TO - 1} onChange={h => upd(s.id, { startHour: h })} />
            <HourSelect label={t('To')} value={s.endHour} from={WORK_FROM + 1} to={WORK_TO} onChange={h => upd(s.id, { endHour: h })} />
            <button type="button" onClick={() => set('shifts', d.shifts.filter(x => x.id !== s.id))} aria-label={`Remove shift ${i + 1}`} className="grid h-12 w-12 place-items-center rounded-xl border border-slate-300 dark:border-slate-600"><Trash2 size={16} /></button>
          </div><Err id={`shift-err-${i}`} m={errors[`shift-${i}`]} /></div>))}</div>
      {d.shifts.length < 4 && <button type="button" onClick={addShift} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-600"><Plus size={16} />{t('Add a shift')}</button>}</div>
  </div>)
}

export function PreviewStep({ d, user }: { d: JobDraft; user: User }) {
  const j = buildJob(user, d)
  return (<div>
    <h2 className="text-2xl font-extrabold">{j.title}</h2><p className="mb-3 text-muted">{j.company}</p>
    <JobSummary job={j} />
    <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm"><b>{t('Every listing is reviewed before it goes live.')}</b> {t("You'll see its status under Jobs.")}</p>
  </div>)
}
