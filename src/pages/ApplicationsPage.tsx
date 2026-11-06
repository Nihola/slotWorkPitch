import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { applicationService, FINAL } from '../services/applicationService'
import { shortDate } from '../utils/time'
import StatusBadge from '../components/StatusBadge'
import type { Application } from '../types'
import { t } from '../i18n'

type F = 'all' | 'active' | 'closed'
export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null)
  const [error, setError] = useState(false)
  const [f, setF] = useState<F>('all')
  const load = () => { setError(false); applicationService.listForSeeker().then(setApps).catch(() => setError(true)) }
  useEffect(load, [])  
  const closed = (a: Application) => FINAL.includes(a.status)
  const shown = apps?.filter(a => f === 'all' || (f === 'closed') === closed(a)) ?? []
  const tab = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`
  return (
    <div className="grid gap-5 pb-16">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Applications')}</h1><p className="text-muted">{t('Follow each application from submitted to accepted.')}</p></div>
      <div role="group" aria-label={t('Filter applications')} className="flex gap-2">{([['all', 'All'], ['active', 'In progress'], ['closed', 'Closed']] as const).map(([k, l]) => <button key={k} aria-pressed={f === k} onClick={() => setF(k)} className={tab(f === k)}>{l}</button>)}</div>
      {error && <div className="rounded-2xl border p-6 text-center"><p className="font-bold">{t('Something went wrong.')}</p><p className="text-muted">{t("We couldn't load your applications. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!error && apps === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      {apps?.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><p className="font-bold">{t('Your next opportunity could be one search away.')}</p><p className="text-muted">{t('When you apply, you can follow it here.')}</p><Link to="/jobs" className="mt-3 inline-block rounded-xl bg-brand px-5 py-2.5 font-bold text-white">{t('Find jobs')}</Link></div>}
      {apps && apps.length > 0 && shown.length === 0 && <p className="text-muted">{t('No applications in this view.')}</p>}
      <ul className="grid gap-3">{shown.map(a => (
        <li key={a.id}><Link to={`/applications/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand dark:border-slate-700 dark:bg-[#131839]">
          <span className="min-w-0 flex-1"><b className="block truncate">{a.jobTitle}</b><span className="text-sm text-muted">{a.company}{a.shiftLabel ? ` · ${a.shiftLabel} shift` : ''} {t('· applied')} {shortDate(a.createdAt)}</span></span><StatusBadge status={a.status} /></Link></li>))}</ul>
    </div>
  )
}
