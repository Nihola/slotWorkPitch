import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Flag, Lock, ShieldCheck, Star } from 'lucide-react'
import AvailabilityCalendar from '../../components/AvailabilityCalendar'
import JobCard from '../../components/JobCard'
import MatchScore from '../../components/MatchScore'
import { jobs as allJobs } from '../../data/jobs'
import { mockSeeker } from '../../services/mockSeeker'
import { calculateMatch, matchLabel } from '../../utils/matching'
import { cellsToRanges, rangesToCells } from '../../utils/availability'
import type { SlotKind } from '../../types'
import { t as tr } from '../../i18n'

const live = allJobs.filter(j => j.moderation === 'approved')
export const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
const Section = ({ id, title, lead, children }: { id?: string; title: string; lead?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-4 py-14"><h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>{lead && <p className="mt-2 max-w-2xl text-lg text-muted">{lead}</p>}<div className="mt-8">{children}</div></section>
)
const cardCls = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'

export function Hero() {
  const [cells, setCells] = useState<Map<string, SlotKind>>(() => rangesToCells(mockSeeker.availability))
  const best = useMemo(() => { const me = { ...mockSeeker, availability: cellsToRanges(cells) }; return live.map(job => ({ job, m: calculateMatch(job, me) })).sort((a, b) => b.m.overall - a.m.overall)[0] }, [cells])
  return (
    <header className="grid items-center gap-10 py-10 lg:grid-cols-[1fr_1.15fr]">
      <div><h1 className="text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">{tr('Find work that fits your life.')}</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">{tr('Most job sites ask what job you want. Slotwork asks when you can work, then matches jobs to your skills, location, and schedule.')}</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link to="/register?role=seeker" className="rounded-xl bg-gradient-to-br from-brand to-violet px-6 py-3.5 font-bold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5">{tr('Find a job')}</Link>
          <Link to="/register?role=employer" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-bold transition hover:-translate-y-0.5 dark:border-slate-600 dark:bg-transparent">{tr('Hire flexible talent')}</Link></div>
        <p className="mt-4 text-sm text-muted">{tr('Free for job seekers · Every job is reviewed before it goes live')}</p></div>
      <div className={cardCls} aria-label={tr('Interactive availability demo')}><b>{tr('Try it: paint your week')}</b><p className="mb-3 text-sm text-muted">{tr('Drag across the hours you can work. Watch the best match change.')}</p>
        <AvailabilityCalendar value={cells} onChange={setCells} />
        <div className="mt-3 flex items-center gap-4 rounded-2xl bg-lav p-3 dark:bg-slate-800/60" aria-live="polite"><MatchScore value={best.m.overall} size={64} />
          <div><b>{best.job.title}</b><p className="text-sm text-muted">{best.job.company} · {matchLabel(best.m.overall)}</p><p className="text-sm font-semibold text-mintfg">{best.m.schedule === 100 ? tr('Your schedule matches this opportunity.') : `Your schedule covers ${best.m.schedule}% of the hours.`}</p></div></div></div>
    </header>
  )
}

export function Stats() {
  const benefits: [string, string][] = [
    ['Schedule-first matching', 'See how a shift fits your week before you apply.'],
    ['Skills and location', 'Compare relevant experience and commute area.'],
    ['Reviewed job listings', 'Every listing is checked before it goes live.'],
    ['Direct conversations', 'Message employers from the application workflow.'],
  ]
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{benefits.map(([title, detail]) => <div key={title} className={cardCls}><p className="font-extrabold">{tr(title)}</p><p className="mt-1 text-sm text-muted">{tr(detail)}</p></div>)}<p className="col-span-2 text-xs text-muted md:col-span-4">{tr('Sample marketplace content for product demonstration, not real customer or hiring data.')}</p></div>
}

export function HowItWorks() {
  const steps = [['Create your profile', 'Skills, experience, and where you live.', 'bg-brand'], ['Set your availability', 'Paint the hours you can work each week.', 'bg-violet'], ['Discover compatible jobs', 'Every job shows how much of its schedule you cover.', 'bg-cyan-500'], ['Apply and connect', 'Pick a shift and chat with the employer.', 'bg-mint']]
  return (<Section id="how" title={tr('How it works')}><ol className="grid gap-4 md:grid-cols-4">{steps.map(([t, d, c], i) => <li key={t} className={cardCls}><span className={`mb-3 grid h-9 w-9 place-items-center rounded-xl font-extrabold text-white ${c}`}>{i + 1}</span><b>{t}</b><p className="mt-1 text-sm text-muted">{d}</p></li>)}</ol></Section>)
}

export function WhyAvailability() {
  const pill = 'rounded-lg px-3 py-1.5 text-sm font-bold'
  return (<Section id="why" title={tr('Why availability matters')} lead="A great job is useless if the hours clash with your classes or your other work.">
    <div className="grid gap-4 md:grid-cols-2">
      <div className={cardCls}><b>{tr('Traditional job search')}</b><p className="mt-1 text-sm text-muted">{tr("You scroll hundreds of listings, then discover the hours don't work.")}</p><div className="mt-4 flex flex-wrap items-center gap-2"><span className={`${pill} bg-slate-100 dark:bg-slate-800`}>{tr('Job')}</span>→<span className={`${pill} bg-slate-100 dark:bg-slate-800`}>{tr('Candidate')}</span></div></div>
      <div className="rounded-3xl border border-brand/40 bg-brand/5 p-5"><b>{tr('Slotwork')}</b><p className="mt-1 text-sm text-muted">{tr('Schedule is part of the match from the first result.')}</p><div className="mt-4 flex flex-wrap items-center gap-2">{['Job', 'Skills', 'Schedule', 'Location'].map((x, i) => <span key={x} className="flex items-center gap-2"><span className={`${pill} bg-gradient-to-br from-brand to-violet text-white`}>{x}</span>{i < 3 && '+'}</span>)}→<span className={`${pill} bg-mintfill text-white`}>{tr('Best match')}</span></div></div>
    </div></Section>)
}

export function Featured() {
  const me = mockSeeker
  const top = live.map(job => ({ job, m: calculateMatch(job, me) })).sort((a, b) => b.m.overall - a.m.overall).slice(0, 3)
  return (<Section title={tr('Jobs that fit real schedules')} lead="A taste of what's live right now. Sign up to see your own match scores."><div className="grid gap-3">{top.map(({ job, m }) => <JobCard key={job.id} job={job} match={m} />)}</div></Section>)
}

export function ShiftDemo() {
  const [b, setB] = useState(13)
  const covered = Array.from({ length: 9 }, (_, i) => 9 + i).filter(h => h < 13 || h >= b).length
  const pct = Math.round((covered / 9) * 100), p = (h: number) => `${((h - 9) / 9) * 100}%`
  const bar = (left: string, width: string, cls: string, label: string) => <div className={`absolute inset-y-0 flex items-center justify-center rounded-lg text-xs font-bold text-white ${cls}`} style={{ left, width }}>{label}</div>
  return (<Section id="shifts" title={tr('Cover a shift with more than one person')} lead="Employers don't need one person for every hour. Slide Candidate B's start time and watch coverage change.">
    <div className={cardCls}><b>{tr('Restaurant assistant · needs 09:00–18:00')}</b>
      <div className="mt-4 grid gap-2 text-sm font-semibold"><div className="grid grid-cols-[96px_1fr] items-center gap-3"><span>{tr('Candidate A')}</span><div className="relative h-8 rounded-lg bg-slate-100 dark:bg-slate-800">{bar(p(9), `${(4 / 9) * 100}%`, 'bg-brand', '09–13')}</div></div>
        <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span>{tr('Candidate B')}</span><div className="relative h-8 rounded-lg bg-slate-100 dark:bg-slate-800">{bar(p(b), `${((18 - b) / 9) * 100}%`, 'bg-violet', `${String(b).padStart(2, '0')}–18`)}</div></div>
        <div className="grid grid-cols-[96px_1fr] items-center gap-3"><span className="text-redfg">{tr('Gap')}</span><div className="relative h-8 rounded-lg bg-slate-100 dark:bg-slate-800">{b > 13 && <div className="absolute inset-y-0 rounded-lg border border-dashed border-red-500 bg-red-500/20" style={{ left: p(13), width: `${((b - 13) / 9) * 100}%` }} />}</div></div></div>
      <label htmlFor="b-start" className="mt-4 block text-sm font-semibold">{tr('Candidate B starts at')} {b}:00</label><input id="b-start" type="range" min={11} max={17} value={b} onChange={e => setB(Number(e.target.value))} className="w-full accent-violet" />
      <p className="mt-3 flex items-center gap-3" aria-live="polite"><span className={`text-4xl font-extrabold ${pct === 100 ? 'text-mintfg' : 'text-amberfg'}`}>{pct}%</span><span className={`rounded-full px-3 py-1 text-sm font-extrabold text-white ${pct === 100 ? 'bg-mintfill' : 'bg-amberfill'}`}>{pct === 100 ? tr('Full coverage') : tr('Partial coverage')}</span>{pct < 100 && <span className="text-sm text-muted">{b - 13} {tr('hour')}{b - 13 > 1 ? tr('s') : ''} {tr('unstaffed')}</span>}</p></div></Section>)
}

export function Audiences() {
  const seeker = ['Flexible work around your life', 'Recommendations ranked by schedule fit', 'Availability you paint once, reused everywhere', 'One-tap applications', 'Direct chat with employers']
  const employer = ['Verified, moderated listings', 'Candidates ranked by schedule fit', 'Shift coverage across several people', 'A simple hiring pipeline', 'Clear status for every applicant']
  const list = (items: string[]) => <ul className="mt-3 grid gap-2 text-sm">{items.map(i => <li key={i} className="flex gap-2"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-mintfg" aria-hidden="true" />{i}</li>)}</ul>
  return (<Section id="audiences" title={tr('Built for both sides of the schedule')}><div className="grid gap-4 md:grid-cols-2">
    <div className={cardCls}><b className="text-xl">{tr('For job seekers')}</b>{list(seeker)}<Link to="/register?role=seeker" className="mt-5 inline-block font-bold text-brandfg">{tr('Create a job seeker account →')}</Link></div>
    <div className={cardCls}><b className="text-xl">{tr('For employers')}</b>{list(employer)}<Link to="/register?role=employer" className="mt-5 inline-block font-bold text-brandfg">{tr('Create an employer account →')}</Link></div></div></Section>)
}

export function Trust() {
  const items: [typeof ShieldCheck, string, string][] = [[BadgeCheck, 'Verified employers', 'Four visible levels, from unverified to trusted.'], [ShieldCheck, 'Moderated jobs', 'Every listing is reviewed before it goes live.'], [Flag, 'Easy reporting', 'Flag a scam or misleading job in two taps.'], [Star, 'Reputation', 'Ratings and completed jobs build trust over time.'], [Lock, 'Secure messaging', 'Conversations stay inside the platform.']]
  return (<Section id="trust" title={tr('Trust and safety')}><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{items.map(([Icon, t, d]) => <li key={t} className={cardCls}><Icon className="mb-2 text-brandfg" size={22} aria-hidden="true" /><b>{t}</b><p className="mt-1 text-sm text-muted">{d}</p></li>)}</ul></Section>)
}

export function FinalCta() {
  return (<section className="my-10 rounded-[32px] bg-gradient-to-br from-ink via-[#2A2D8F] to-violet px-6 py-14 text-center text-white"><h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl">{tr("Your schedule shouldn't limit your opportunities.")}</h2>
    <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/register?role=seeker" className="rounded-xl bg-white px-6 py-3.5 font-bold text-ink">{tr('Find your match')}</Link><Link to="/register?role=employer" className="rounded-xl border border-white/40 px-6 py-3.5 font-bold">{tr('Hire talent')}</Link></div></section>)
}
