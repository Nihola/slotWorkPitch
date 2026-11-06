import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { t } from '../i18n'
const input = 'mt-1 w-full rounded-xl border bg-transparent px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-brand'
const ring = (e?: string) => (e ? 'border-red-500' : 'border-slate-300 dark:border-slate-600')
export function TextField({ label, error, id, hint, ...rest }: { label: string; error?: string; id: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} className={`${input} ${ring(error)}`} {...rest} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-semibold text-redfg">{error}</p>}
    </div>
  )
}
export function SelectField({ label, error, id, options, ...rest }: { label: string; error?: string; id: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <select id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`${input} ${ring(error)}`} {...rest}>
        <option value="" className="text-ink">{t('Choose…')}</option>
        {options.map(o => <option key={o} value={o} className="text-ink">{t(o)}</option>)}
      </select>
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-semibold text-redfg">{error}</p>}
    </div>
  )
}
export function TextAreaField({ label, error, id, hint, ...rest }: { label: string; error?: string; id: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <textarea id={id} rows={5} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} className={`${input} ${ring(error)}`} {...rest} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-semibold text-redfg">{error}</p>}
    </div>
  )
}
