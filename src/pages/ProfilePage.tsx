import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { applicationService } from '../services/applicationService'
import { profileStrength } from '../features/onboarding/draft'
import type { Availability } from '../types'
import { t as tr } from '../i18n'

const DAYS = [tr('Monday'), tr('Tuesday'), tr('Wednesday'), tr('Thursday'), tr('Friday'), tr('Saturday'), tr('Sunday')]
const card = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'
export default function ProfilePage() {
  const { session } = useAuth()
  const p = session!.profile!
  const [accepted, setAccepted] = useState<number | null>(null)
  useEffect(() => { applicationService.listForSeeker().then(l => setAccepted(l.filter(a => a.status === 'accepted').length)).catch(() => setAccepted(0)) }, [])
  const strength = profileStrength(p)
  const byDay = (k: Availability['kind']) => DAYS.map((d, i) => ({ d, r: p.availability.filter(a => a.dayOfWeek === i && a.kind === k) })).filter(x => x.r.length)
  const hours = p.availability.reduce((n, a) => n + a.endHour - a.startHour, 0)
  const tips: string[] = []
  if (p.skills.length < 3) tips.push('Add at least three skills')
  if (!p.district) tips.push('Add your district so nearby jobs rank higher')
  if (hours < 10) tips.push('Mark at least 10 hours of availability')
  return (
    <div className="grid gap-5 pb-16">
      <header className={`${card} flex flex-wrap items-center gap-4`}>
        <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-3xl font-extrabold text-white" aria-hidden="true">{p.name[0]}</div>
        <div className="min-w-0 flex-1"><h1 className="text-3xl font-extrabold tracking-tight">{p.name}</h1><p className="text-muted">{p.headline}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-muted"><span className="inline-flex items-center gap-1"><MapPin size={14} />{[p.district, p.city].filter(Boolean).join(', ')}</span>
            <span className="inline-flex items-center gap-1"><Star size={14} className="text-amberfg" fill="currentColor" />{p.rating ? p.rating.toFixed(1) : tr('No ratings yet')}</span>
            <span>{accepted === null ? '…' : accepted} {tr('job')}{accepted === 1 ? '' : tr('s')} {tr('accepted')}</span></p></div>
        <Link to="/onboarding" className="rounded-xl bg-brand px-5 py-2.5 font-bold text-white">{tr('Edit profile')}</Link>
      </header>
      <section className={card} aria-labelledby="str-h"><div className="flex justify-between"><h2 id="str-h" className="text-lg font-extrabold">{tr('Profile strength')}</h2><b>{strength}%</b></div>
        <div className="mt-2 h-3 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-3 rounded-full bg-gradient-to-r from-brand to-violet transition-all duration-700" style={{ width: `${strength}%` }} /></div>
        {tips.length > 0 ? <ul className="mt-3 list-disc pl-5 text-sm text-muted">{tips.map(t => <li key={t}>{t}</li>)}</ul> : <p className="mt-2 text-sm text-muted">{tr('Your profile is complete. Employers can see everything they need.')}</p>}</section>
      <div className="grid gap-5 md:grid-cols-2">
        <section className={card} aria-labelledby="sk-h"><h2 id="sk-h" className="text-lg font-extrabold">{tr('Skills')}</h2><p className="mt-2 flex flex-wrap gap-2">{p.skills.map(s => <span key={s} className="rounded-full bg-lav px-3 py-1 text-sm font-semibold dark:bg-slate-800">{s}</span>)}</p></section>
        <section className={card} aria-labelledby="bg-h"><h2 id="bg-h" className="text-lg font-extrabold">{tr('Background')}</h2>
          <dl className="mt-2 grid gap-1 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted">{tr('Education')}</dt><dd>{p.education || '—'}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">{tr('Experience')}</dt><dd>{p.experience || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{tr('Preferred work')}</dt><dd className="text-right">{p.jobTypes?.join(', ') || '—'}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">{tr('Remote jobs')}</dt><dd>{p.remoteOk ? tr('Open to remote') : tr('Local only')}</dd></div></dl></section>
      </div>
      <section className={card} aria-labelledby="av-h"><h2 id="av-h" className="text-lg font-extrabold">{tr('Availability ·')} {hours} {tr('hours per week')}{p.flexible ? tr(' · flexible') : ''}</h2>
        {p.availability.length === 0 ? <p className="mt-2 text-sm text-muted">{tr('No availability set yet.')} <Link to="/jobs" className="font-bold text-brandfg">{tr('Set it on the jobs page.')}</Link></p> : (<ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {byDay('available').map(({ d, r }) => <li key={d} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-mint" aria-hidden="true" /><b className="w-24">{d}</b>{r.map(a => `${a.startHour}:00–${a.endHour}:00`).join(', ')}</li>)}
          {byDay('preferred').map(({ d, r }) => <li key={`p${d}`} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet" aria-hidden="true" /><b className="w-24">{d}</b>{r.map(a => `${a.startHour}:00–${a.endHour}:00`).join(', ')} <span className="text-xs text-muted">{tr('preferred')}</span></li>)}</ul>)}
        {(p.availableFrom || p.availableUntil) && <p className="mt-3 text-sm text-muted">{tr('Available')} {p.availableFrom ? `from ${p.availableFrom}` : ''} {p.availableUntil ? `until ${p.availableUntil}` : ''}</p>}</section>
    </div>
  )
}
