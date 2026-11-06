import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useJobs } from '../hooks/useJobs'
import { useSaved } from '../hooks/useSaved'
import { useSeeker } from '../context/SeekerContext'
import { matchingService } from '../services/matchingService'
import { matchesQuery, monthlyPay, parseQuery } from '../utils/search'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import JobCard from '../components/JobCard'
import type { JobType } from '../types'
import { plural, t as tr } from '../i18n'

const TYPES: JobType[] = ['part-time', 'full-time', 'shift-based', 'short-term', 'one-time', 'remote']
type Sort = 'match' | 'newest' | 'pay'
export default function JobsPage() {
  const { jobs, loading, error, reload } = useJobs()
  const { seeker, cells, setCells } = useSeeker()
  const { isSaved, toggle } = useSaved()
  const [q, setQ] = useState('')
  const [types, setTypes] = useState<JobType[]>([])
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [fitOnly, setFitOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('match')
  const [showFilters, setShowFilters] = useState(false)

  const parsed = useMemo(() => parseQuery(q), [q])
  const ranked = useMemo(() => jobs.map(job => ({ job, match: matchingService.calculateMatch(job, seeker) })), [jobs, seeker])
  const results = useMemo(() => {
    const r = ranked.filter(({ job, match }) => matchesQuery(job, parsed) && (!types.length || types.includes(job.type)) && (!remoteOnly || job.type === 'remote' || job.workMode === 'remote') && (!fitOnly || match.schedule >= 80))
    return r.sort((a, b) => sort === 'match' ? b.match.overall - a.match.overall : sort === 'newest' ? b.job.postedAt.localeCompare(a.job.postedAt) : monthlyPay(b.job) - monthlyPay(a.job))
  }, [ranked, parsed, types, remoteOnly, fitOnly, sort])
  const activeFilters = types.length + (remoteOnly ? 1 : 0) + (fitOnly ? 1 : 0)
  const clear = () => { setQ(''); setTypes([]); setRemoteOnly(false); setFitOnly(false) }
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`

  return (
    <div className="grid gap-5 pb-16">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{tr('Find work that fits your life')}</h1>
        <p className="mt-1 text-muted">{tr('Jobs are ranked by how well they fit your skills, location, and weekly availability.')}</p></div>

      <div role="search" className="grid gap-3">
        <div className="relative"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label htmlFor="job-search" className="sr-only">{tr('Search jobs, skills, companies')}</label>
          <input id="job-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={tr('Try “Part-time English teaching jobs after 5pm in Tashkent”')}
            className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-10 pr-10 text-sm shadow-sm dark:border-slate-600 dark:bg-[#131839]" />
          {q && <button onClick={() => setQ('')} aria-label={tr('Clear search')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}</div>
        {q.trim() && parsed.chips.length > 0 && <p className="flex flex-wrap items-center gap-2 text-sm" aria-label={tr('Understood as')}><span className="text-muted">{tr('Understood as:')}</span>{parsed.chips.map(c => <span key={c} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brandfg">{c}</span>)}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold md:hidden dark:border-slate-600"><SlidersHorizontal size={16} />{tr('Filters')}{activeFilters > 0 && ` (${activeFilters})`}</button>
          <div className={`${showFilters ? 'flex' : 'hidden'} flex-wrap items-center gap-2 md:flex`} role="group" aria-label={tr('Filters')}>
            {TYPES.map(t => <button key={t} aria-pressed={types.includes(t)} onClick={() => setTypes(l => l.includes(t) ? l.filter(x => x !== t) : [...l, t])} className={chip(types.includes(t))}>{tr(t)}</button>)}
            <button aria-pressed={remoteOnly} onClick={() => setRemoteOnly(v => !v)} className={chip(remoteOnly)}>{tr('Remote only')}</button>
            <button aria-pressed={fitOnly} onClick={() => setFitOnly(v => !v)} className={chip(fitOnly)}>{tr('Fits my schedule (80%+)')}</button>
          </div>
          <label className="ml-auto text-sm font-bold">{tr('Sort')} <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="ml-1 rounded-xl border border-slate-300 bg-transparent px-2 py-2 dark:border-slate-600">
            <option value="match" className="text-ink">{tr('Best match')}</option><option value="newest" className="text-ink">{tr('Newest')}</option><option value="pay" className="text-ink">{tr('Highest pay')}</option></select></label>
        </div>
      </div>

      <details open className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131839]">
        <summary className="cursor-pointer text-sm font-bold">{tr('Your availability ·')} {cells.size} {tr('hours per week')}</summary>
        <p className="mb-2 mt-1 text-xs text-muted">{tr('Drag to paint the hours you can work. Match scores update instantly and are saved to your profile.')}</p>
        <AvailabilityCalendar value={cells} onChange={setCells} />
      </details>

      <section aria-live="polite" aria-labelledby="results-h" className="grid gap-3">
        <h2 id="results-h" className="sr-only">{tr('Search results')}</h2>
        {!loading && !error && <p className="text-sm font-semibold text-muted">{plural(results.length, { one: '{n} opportunity', few: '{n} opportunities', many: '{n} opportunities', other: '{n} opportunities' })}</p>}
        {loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        {error && <div className="rounded-2xl border p-6 text-center"><p className="font-bold">{tr('Something went wrong.')}</p><p className="text-muted">{tr("We couldn't load your opportunities. Please try again.")}</p>
          <button onClick={reload} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{tr('Try again')}</button></div>}
        {!loading && !error && results.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><p className="font-bold">{tr('No jobs match your search.')}</p><p className="text-muted">{tr('Try fewer filters or a broader search.')}</p><button onClick={clear} className="mt-3 font-bold text-brandfg">{tr('Clear search and filters')}</button></div>}
        {!loading && !error && results.map(({ job, match }) => <JobCard key={job.id} job={job} match={match} saved={isSaved(job.id)} onToggleSave={() => toggle(job.id)} />)}
      </section>
    </div>
  )
}
