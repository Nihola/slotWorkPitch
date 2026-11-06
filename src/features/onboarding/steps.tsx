import { useState } from 'react'
import { TextField, SelectField } from '../../components/TextField'
import SkillPicker from '../../components/SkillPicker'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import { cellKey } from '../../utils/availability'
import { weeklyHours, type Errors, type OnboardingDraft } from './draft'
import type { JobType, SlotKind } from '../../types'
import { t as tr } from '../../i18n'

export interface StepProps { d: OnboardingDraft; set: <K extends keyof OnboardingDraft>(k: K, v: OnboardingDraft[K]) => void; errors: Errors }
const Err = ({ id, m }: { id: string; m?: string }) => (m ? <p id={id} role="alert" className="mt-2 text-xs font-semibold text-redfg">{m}</p> : null)
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`

export function PersonalStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <TextField id="name" label={tr('Full name')} autoComplete="name" value={d.name} onChange={e => set('name', e.target.value)} error={errors.name} />
    <TextField id="headline" label={tr('Headline')} hint={tr('One line employers see first, like “Language student” or “Barista with 2 years’ experience”.')} value={d.headline} onChange={e => set('headline', e.target.value)} error={errors.headline} />
  </div>)
}

const SUGGESTED = ['English', 'Teaching', 'Service', 'Customer support', 'Excel', 'Typing', 'Coffee', 'Events', 'Russian', 'Sales', 'Driving', 'Cooking']
export const SkillsStep = ({ d, set, errors }: StepProps) => <SkillPicker value={d.skills} onChange={v => set('skills', v)} suggestions={SUGGESTED} error={errors.skills} />

export function ExperienceStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <SelectField id="education" label={tr('Education')} value={d.education} onChange={e => set('education', e.target.value)} error={errors.education} options={['High school', 'Vocational / college', 'Bachelor student', 'Bachelor degree', 'Master degree or higher']} />
    <SelectField id="experience" label={tr('Work experience')} value={d.experience} onChange={e => set('experience', e.target.value)} error={errors.experience} options={['No experience yet', 'Under 1 year', '1–3 years', '3+ years']} />
  </div>)
}

const TYPES: { id: JobType; label: string; text: string }[] = [
  { id: 'part-time', label: tr('Part-time'), text: tr('A few hours most weeks') }, { id: 'full-time', label: tr('Full-time'), text: tr('A standard working week') },
  { id: 'shift-based', label: tr('Shift-based'), text: tr('Fixed shifts that rotate') }, { id: 'short-term', label: tr('Short-term'), text: tr('A few weeks or months') },
  { id: 'one-time', label: tr('One-time'), text: tr('A single day or event') }, { id: 'remote', label: tr('Remote'), text: tr('Work from anywhere') },
]
export function JobTypesStep({ d, set, errors }: StepProps) {
  const toggle = (t: JobType) => set('jobTypes', d.jobTypes.includes(t) ? d.jobTypes.filter(x => x !== t) : [...d.jobTypes, t])
  return (<div>
    <div role="group" aria-label={tr('Preferred job types')} className="grid gap-3 sm:grid-cols-2">{TYPES.map(t => (
      <label key={t.id} className={`cursor-pointer rounded-2xl border-2 p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${d.jobTypes.includes(t.id) ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'}`}>
        <input type="checkbox" className="sr-only" checked={d.jobTypes.includes(t.id)} onChange={() => toggle(t.id)} /><b>{t.label}</b><span className="block text-sm text-muted">{t.text}</span></label>))}</div>
    <Err id="types-err" m={errors.jobTypes} />
  </div>)
}

export function LocationStep({ d, set, errors }: StepProps) {
  return (<div className="grid gap-4">
    <SelectField id="city" label={tr('City')} value={d.city} onChange={e => set('city', e.target.value)} error={errors.city} options={['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan', 'Fergana']} />
    <TextField id="district" label={tr('District (optional)')} hint={tr('Used to rank nearby jobs higher.')} value={d.district} onChange={e => set('district', e.target.value)} />
    <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={d.remoteOk} onChange={e => set('remoteOk', e.target.checked)} className="h-5 w-5 accent-brand" />{tr("I'm open to remote jobs")}</label>
  </div>)
}

const PRESETS: { label: string; days: number[]; from: number; to: number }[] = [
  { label: tr('Weekday mornings'), days: [0, 1, 2, 3, 4], from: 8, to: 13 }, { label: tr('Weekday evenings'), days: [0, 1, 2, 3, 4], from: 17, to: 21 }, { label: tr('Weekends'), days: [5, 6], from: 9, to: 18 },
]
export function AvailabilityStep({ d, set, errors }: StepProps) {
  const [mode, setMode] = useState<SlotKind>('available')
  const addPreset = (p: (typeof PRESETS)[number]) => { const m = new Map(d.cells); p.days.forEach(day => { for (let h = p.from; h < p.to; h++) m.set(cellKey(day, h), mode) }); set('cells', m) }
  return (<div className="grid gap-4">
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label={tr('Paint as')} className="inline-flex rounded-xl border border-slate-300 p-1 dark:border-slate-600">{(['available', 'preferred'] as SlotKind[]).map(k => (
        <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize ${mode === k ? (k === 'available' ? 'bg-mintfill text-white' : 'bg-violet text-white') : ''}`}>{k}</button>))}</div>
      <span className="text-xs text-muted">{tr('Drag across hours to paint. Start on a painted hour to erase.')}</span></div>
    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><AvailabilityCalendar value={d.cells} onChange={c => set('cells', c)} mode={mode} /></div>
    <div className="flex flex-wrap gap-2" aria-label={tr('Quick add')}>{PRESETS.map(p => <button key={p.label} type="button" onClick={() => addPreset(p)} className={chip(false)}>+ {p.label}</button>)}
      <button type="button" onClick={() => set('cells', new Map())} className={chip(false)}>{tr('Clear all')}</button></div>
    <p className="text-sm font-semibold" aria-live="polite">{weeklyHours(d)} {tr('hours per week marked')}</p><Err id="cells-err" m={errors.cells} />
    <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={d.flexible} onChange={e => set('flexible', e.target.checked)} className="h-5 w-5 accent-brand" />{tr('My schedule is flexible. I can adjust for the right job.')}</label>
    <fieldset><legend className="text-sm font-bold">{tr('Date range (optional)')}</legend><p className="text-xs text-muted">{tr("Leave blank if you're available all year.")}</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2"><TextField id="from" label={tr('Available from')} type="date" value={d.from} onChange={e => set('from', e.target.value)} /><TextField id="until" label={tr('Available until')} type="date" value={d.until} min={d.from || undefined} onChange={e => set('until', e.target.value)} error={errors.until} /></div></fieldset>
  </div>)
}
