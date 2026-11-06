import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { ApplicationError, applicationService } from '../services/applicationService'
import { jobService } from '../services/jobService'
import { calculateMatch, scheduleCompatibility } from '../utils/matching'
import { shortDate } from '../utils/time'
import MatchScore from '../components/MatchScore'
import Modal from '../components/Modal'
import StatusBadge, { STATUS_META } from '../components/StatusBadge'
import type { Application, ApplicationStatus, Job } from '../types'
import { t } from '../i18n'

type Act = { to: ApplicationStatus; label: string; danger?: boolean }
const ACTIONS: Record<ApplicationStatus, Act[]> = {
  submitted: [{ to: 'under_review', label: t('Start review') }, { to: 'shortlisted', label: t('Shortlist') }, { to: 'rejected', label: t('Reject'), danger: true }],
  under_review: [{ to: 'shortlisted', label: t('Shortlist') }, { to: 'rejected', label: t('Reject'), danger: true }],
  shortlisted: [{ to: 'interview', label: t('Invite to interview') }, { to: 'accepted', label: t('Accept') }, { to: 'rejected', label: t('Reject'), danger: true }],
  interview: [{ to: 'accepted', label: t('Accept') }, { to: 'rejected', label: t('Reject'), danger: true }], accepted: [], rejected: [], withdrawn: [],
}
const DONE: Partial<Record<ApplicationStatus, string>> = { under_review: 'Review started', shortlisted: 'Candidate shortlisted', interview: 'Interview invitation sent', accepted: 'Candidate accepted', rejected: 'Application rejected' }

export default function EmployerApplicationsPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const jobFilter = params.get('job') ?? 'all'
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')
  const [apps, setApps] = useState<Application[] | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState(false)
  const [dialog, setDialog] = useState<{ app: Application; act: Act } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { setError(false); Promise.all([applicationService.listForEmployer(), jobService.getEmployerJobs()]).then(([a, j]) => { setApps(a); setJobs(j) }).catch(() => setError(true)) }, [])
  useEffect(load, [load])

  const run = async (a: Application, to: ApplicationStatus, n?: string) => {
    setBusy(true)
    try { await applicationService.setStatus(a.id, to, n); toast(DONE[to] ?? t('Updated')); setDialog(null); setNote(''); load() }
    catch (e) { toast(e instanceof ApplicationError ? e.message : t("We couldn't update that application. Please try again.")) }
    finally { setBusy(false) }
  }
  const click = (a: Application, act: Act) => { if (act.to === 'rejected' || act.to === 'interview') { setNote(''); setDialog({ app: a, act }) } else run(a, act.to) }
  const shown = apps?.filter(a => (jobFilter === 'all' || a.jobId === jobFilter) && (status === 'all' || a.status === status)) ?? []
  const sel = 'ml-2 rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600'
  return (
    <div className="grid gap-5 pb-16">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Applications')}</h1><p className="text-muted">{t("Review candidates and move them through hiring. They're notified at every step.")}</p></div>
      <div className="flex flex-wrap gap-3 text-sm font-bold">
        <label>{t('Job')} <select value={jobFilter} onChange={e => setParams(e.target.value === 'all' ? {} : { job: e.target.value })} className={sel}><option value="all" className="text-ink">{t('All jobs')}</option>{jobs.map(j => <option key={j.id} value={j.id} className="text-ink">{j.title}</option>)}</select></label>
        <label>{t('Status')} <select value={status} onChange={e => setStatus(e.target.value as ApplicationStatus | 'all')} className={sel}><option value="all" className="text-ink">{t('All')}</option>{(Object.keys(STATUS_META) as ApplicationStatus[]).map(s => <option key={s} value={s} className="text-ink">{STATUS_META[s].label}</option>)}</select></label>
      </div>
      {error && <div className="rounded-2xl border p-6 text-center"><p className="font-bold">{t('Something went wrong.')}</p><p className="text-muted">{t("We couldn't load applications. Please try again.")}</p><button onClick={load} className="mt-3 rounded-xl bg-brand px-4 py-2 font-bold text-white">{t('Try again')}</button></div>}
      {!error && apps === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      {apps?.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><p className="font-bold">{t('No applications yet.')}</p><p className="text-muted">{t('Candidates who apply to your jobs will appear here.')}</p><Link to="/employer/jobs/new" className="mt-3 inline-block font-bold text-brandfg">{t('Post a job')}</Link></div>}
      {apps && apps.length > 0 && shown.length === 0 && <p className="text-muted">{t('No applications match these filters.')}</p>}
      <ul className="grid gap-3">{shown.map(a => {
        const job = jobs.find(j => j.id === a.jobId)
        const target = job && a.shiftStart !== undefined ? { ...job, schedule: { ...job.schedule, startHour: a.shiftStart, endHour: a.shiftEnd! } } : job
        const fit = target ? Math.round(scheduleCompatibility(target, a.candidate.availability).ratio * 100) : null
        const match = job ? calculateMatch(job, a.candidate).overall : null
        const skills = new Set(job?.skills.map(s => s.toLowerCase()))
        return (
          <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131839]">
            <div className="flex flex-wrap items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-violet font-bold text-white" aria-hidden="true">{a.candidate.name[0]}</div>
              <div className="min-w-0 flex-1"><h2 className="font-bold">{a.candidate.name}</h2><p className="text-sm text-muted">{a.candidate.headline} · {[a.candidate.district, a.candidate.city].filter(Boolean).join(', ')}</p>
                <p className="mt-0.5 text-sm">{t('Applied for')} <b>{a.jobTitle}</b>{a.shiftLabel ? ` · ${a.shiftLabel} shift` : ''} · {shortDate(a.createdAt)}</p></div>
              <StatusBadge status={a.status} />{match !== null && <MatchScore value={match} size={48} />}
            </div>
            {fit !== null && <div className="mt-3"><div className="flex justify-between text-xs font-semibold"><span>{t('Schedule fit')}{a.shiftLabel ? ` for the ${a.shiftLabel.toLowerCase()} shift` : ''}</span><span>{fit}%</span></div>
              <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700" role="img" aria-label={`Schedule fit ${fit}%`}><div className={`h-2 rounded-full ${fit >= 80 ? 'bg-mint' : fit >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${fit}%` }} /></div></div>}
            <p className="mt-3 flex flex-wrap gap-1.5">{a.candidate.skills.map(s => <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${skills.has(s.toLowerCase()) ? 'bg-mint/15 text-mintfg' : 'bg-slate-100 dark:bg-slate-800'}`}>{s}</span>)}</p>
            {a.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">“{a.message}”</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ACTIONS[a.status].map(act => <button key={act.to} onClick={() => click(a, act)} disabled={busy} aria-label={`${act.label}: ${a.candidate.name}`} className={act.danger ? 'rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-redfg' : 'rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60'}>{act.label}</button>)}
              <Link to={`/employer/messages?c=${a.conversationId}`} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-600"><MessageSquare size={14} />{t('Message')}</Link>
            </div>
          </li>) })}</ul>
      {dialog && (
        <Modal title={dialog.act.to === 'rejected' ? `Reject ${dialog.app.candidate.name}?` : `Invite ${dialog.app.candidate.name} to interview`} onClose={() => setDialog(null)}>
          <label htmlFor="act-note" className="text-sm font-bold">{dialog.act.to === 'rejected' ? t('Message to the candidate (optional)') : t('Interview details (optional)')}</label>
          <textarea id="act-note" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={dialog.act.to === 'rejected' ? t('A short, kind explanation helps candidates.') : t('For example: Tuesday 10:00 at our Yunusobod location.')} className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-600" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => setDialog(null)} className="rounded-xl border border-slate-300 py-3 font-bold dark:border-slate-600">{t('Cancel')}</button>
            <button onClick={() => run(dialog.app, dialog.act.to, note)} disabled={busy} className={`rounded-xl py-3 font-bold text-white disabled:opacity-60 ${dialog.act.to === 'rejected' ? 'bg-redfill' : 'bg-brand'}`}>{busy ? t('Working…') : dialog.act.to === 'rejected' ? t('Confirm rejection') : t('Send invitation')}</button></div>
        </Modal>)}
    </div>
  )
}
