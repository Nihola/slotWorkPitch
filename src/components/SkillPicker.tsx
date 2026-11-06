import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { TextField } from './TextField'
import { t } from '../i18n'

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`
interface Props { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; error?: string; max?: number }
/** Suggested chips plus free-text skills. Case-insensitive de-duplication. */
export default function SkillPicker({ value, onChange, suggestions, error, max = 12 }: Props) {
  const [text, setText] = useState('')
  const has = (s: string) => value.some(x => x.toLowerCase() === s.toLowerCase())
  const toggle = (s: string) => onChange(has(s) ? value.filter(x => x.toLowerCase() !== s.toLowerCase()) : value.length >= max ? value : [...value, s])
  const add = () => { const v = text.trim().slice(0, 30); if (v && !has(v)) toggle(v); setText('') }
  const custom = value.filter(s => !suggestions.includes(s))
  return (
    <div className="grid gap-4">
      <div role="group" aria-label={t('Suggested skills')} aria-describedby="skills-err" className="flex flex-wrap gap-2">{suggestions.map(s => <button key={s} type="button" aria-pressed={has(s)} onClick={() => toggle(s)} className={chip(has(s))}>{s}</button>)}</div>
      {custom.length > 0 && <div className="flex flex-wrap gap-2">{custom.map(s => <button key={s} type="button" onClick={() => toggle(s)} aria-label={`Remove ${s}`} className={`${chip(true)} inline-flex items-center gap-1`}>{s}<X size={14} /></button>)}</div>}
      <div className="flex gap-2"><div className="flex-1"><TextField id="skill" label={t('Add another skill')} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} /></div>
        <button type="button" onClick={add} aria-label={t('Add skill')} className="mt-6 grid h-12 w-12 place-items-center rounded-xl border border-slate-300 dark:border-slate-600"><Plus size={18} /></button></div>
      <p className="text-xs text-muted">{value.length}/{max} {t('selected')}</p>
      {error && <p id="skills-err" role="alert" className="text-xs font-semibold text-redfg">{error}</p>}
    </div>
  )
}
