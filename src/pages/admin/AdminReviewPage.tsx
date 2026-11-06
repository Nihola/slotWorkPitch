import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { moderationService, ModerationError, type Review } from '../../services/moderationService'
import { REPORT_REASONS } from '../../services/reportService'
import { useToast } from '../../context/ToastContext'
import JobSummary from '../../components/JobSummary'
import RiskBadge from '../../components/RiskBadge'
import VerificationBadge from '../../components/VerificationBadge'
import { ACTION_LABEL, STATUS_CLS, STATUS_LABEL, btnGhost, btnPrimary, card, fmtDate } from './ui'
import { t } from '../../i18n'

type Mode = 'reject' | 'changes' | null
export default function AdminReviewPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const nav = useNavigate()
  const [rev, setRev] = useState<Review | null | undefined>(undefined)
  const [mode, setMode] = useState<Mode>(null)
  const [text, setText] = useState('')
  const [ack, setAck] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { setRev(undefined); moderationService.getReview(id).then(setRev).catch(() => setRev(null)) }, [id])
  useEffect(load, [load])

  if (rev === undefined) return <div className="grid gap-4"><div className="h-24 animate-pulse rounded-2xl bg-white/5" /><div className="h-72 animate-pulse rounded-2xl bg-white/5" /></div>
  if (rev === null) return <div className={`${card} text-center`}><p className="font-bold">{t("We couldn't find that job.")}</p><Link to="/admin/moderation" className="mt-2 inline-block font-bold text-cyanfg">{t('Back to the queue')}</Link></div>

  const { job, risk, reports, employerJobs, employerLog, jobLog } = rev
  const others = employerJobs.filter(j => j.id !== job.id)
  const otherLog = employerLog.filter(e => e.jobId !== job.id)
  const rejections = employerLog.filter(e => e.action === 'reject').length
  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true); setErr('')
    try { await fn(); toast(done); nav('/admin/moderation') }
    catch (e) { setErr(e instanceof ModerationError ? e.message : t('Something went wrong. Please try again.')) }
    finally { setBusy(false) }
  }
  const reasonLabel = (r: string) => REPORT_REASONS.find(x => x.id === r)?.label ?? r
  const pending = job.moderation === 'pending'

  return (
    <div className="grid gap-5">
      <Link to="/admin/moderation" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white"><ArrowLeft size={16} />{t('Moderation queue')}</Link>
      <header className={`${card} flex flex-wrap items-start gap-3`}>
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold tracking-tight">{job.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">{job.company}<VerificationBadge level={job.verification} /><span className="text-sm">{t('Submitted')} {fmtDate(job.postedAt)}</span></p></div>
        <RiskBadge level={risk.level} /><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLS[job.moderation]}`}>{STATUS_LABEL[job.moderation]}</span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="grid gap-5">
          <section className={card} aria-labelledby="risk-h"><h2 id="risk-h" className="text-lg font-extrabold">{t('Risk analysis')} <span className="ml-1 text-sm font-semibold text-slate-400">{t('score')} {risk.score}</span></h2>
            {risk.signals.length === 0 && <p className="mt-2 text-slate-400">{t('No risk signals found.')}</p>}
            <ul className="mt-3 grid gap-2">{risk.signals.map(s => <li key={s} className="flex items-start gap-2 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amberfg" aria-hidden="true" />{s}</li>)}
              {risk.mitigations.map(m => <li key={m} className="flex items-start gap-2 text-sm text-mintfg"><CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{m}</li>)}</ul></section>
          <section className={card} aria-labelledby="job-h"><h2 id="job-h" className="mb-3 text-lg font-extrabold">{t('Job information')}</h2><JobSummary job={job} /></section>
          <section className={card} aria-labelledby="rep-h"><h2 id="rep-h" className="text-lg font-extrabold">{t('Reports on this job (')}{reports.length})</h2>
            {reports.length === 0 ? <p className="mt-2 text-slate-400">{t('No reports on this job.')}</p> : <ul className="mt-3 grid gap-3">{reports.map(r => (
              <li key={r.id} className="rounded-xl border border-white/10 p-3 text-sm"><p className="font-bold">{reasonLabel(r.reason)} <span className="ml-1 text-xs font-semibold text-slate-400">{r.status} · {fmtDate(r.createdAt)}</span></p>{r.details && <p className="mt-1 text-slate-300">“{r.details}”</p>}</li>))}</ul>}</section>
        </div>

        <div className="grid gap-5 lg:sticky lg:top-6">
          <section className={card} aria-labelledby="dec-h"><h2 id="dec-h" className="text-lg font-extrabold">{t('Decision')}</h2>
            {!pending ? (<div className="mt-3 text-sm"><p className="font-bold">{t('Already reviewed:')} {STATUS_LABEL[job.moderation]}</p>{job.moderationNote && <p className="mt-1 text-slate-300">“{job.moderationNote}”</p>}</div>) : (<div className="mt-3 grid gap-3">
              {risk.level === 'high' && <label className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500" />{t("I've reviewed the risk signals for this high-risk job.")}</label>}
              {mode === null ? (<>
                <button onClick={() => run(() => moderationService.approve(job.id, { acknowledgedRisk: ack }), 'Job approved')} disabled={busy} className={btnPrimary}>{busy ? t('Working…') : t('Approve')}</button>
                <button onClick={() => { setMode('changes'); setErr('') }} className={btnGhost}>{t('Request changes')}</button>
                <button onClick={() => { setMode('reject'); setErr('') }} className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-bold text-redfg hover:bg-red-500/10">{t('Reject')}</button>
              </>) : (<>
                <label htmlFor="decision-text" className="text-sm font-bold">{mode === 'reject' ? t('Reason for rejection') : t('What should the employer change?')}</label>
                <textarea id="decision-text" rows={4} value={text} onChange={e => { setText(e.target.value); setErr('') }} placeholder={t('The employer will see this message.')} className="w-full rounded-xl border border-white/15 bg-transparent p-3 text-sm" />
                <button disabled={busy} onClick={() => run(() => mode === 'reject' ? moderationService.reject(job.id, text) : moderationService.requestChanges(job.id, text), mode === 'reject' ? 'Job rejected' : 'Changes requested')}
                  className={mode === 'reject' ? 'rounded-xl bg-redfill px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50' : btnPrimary}>{busy ? t('Working…') : mode === 'reject' ? t('Confirm rejection') : t('Send change request')}</button>
                <button onClick={() => { setMode(null); setText(''); setErr('') }} className={btnGhost}>{t('Cancel')}</button>
              </>)}
              {err && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{err}</p>}
            </div>)}</section>
          <section className={card} aria-labelledby="emp-h"><h2 id="emp-h" className="text-lg font-extrabold">{t('Employer')}</h2>
            <p className="mt-2 font-bold">{job.company}</p><VerificationBadge level={job.verification} />
            <dl className="mt-3 grid gap-1 text-sm text-slate-300"><div className="flex justify-between"><dt>{t('Jobs posted')}</dt><dd>{employerJobs.length}</dd></div><div className="flex justify-between"><dt>{t('Earlier rejections')}</dt><dd>{rejections}</dd></div></dl>
            {others.length > 0 && <ul className="mt-3 grid gap-1 border-t border-white/10 pt-3 text-sm">{others.map(o => <li key={o.id} className="flex justify-between gap-2"><Link to={`/admin/moderation/${o.id}`} className="truncate hover:underline">{o.title}</Link><span className={`shrink-0 rounded-full px-2 text-xs font-bold ${STATUS_CLS[o.moderation]}`}>{STATUS_LABEL[o.moderation]}</span></li>)}</ul>}</section>
          <section className={card} aria-labelledby="hist-h"><h2 id="hist-h" className="text-lg font-extrabold">{t('Moderation history')}</h2>
            {jobLog.length + otherLog.length === 0 ? <p className="mt-2 text-sm text-slate-400">{t('No previous moderation actions.')}</p> : <ul className="mt-3 grid gap-3 text-sm">{[...jobLog, ...otherLog].map(e => (
              <li key={e.id}><p className="font-bold">{ACTION_LABEL[e.action]}{e.jobId !== job.id && <span className="font-normal text-slate-400"> · {e.jobTitle}</span>}</p>{e.reason && <p className="text-slate-300">“{e.reason}”</p>}<p className="text-xs text-muted">{e.actorName} · {fmtDate(e.at)}</p></li>))}</ul>}</section>
        </div>
      </div>
    </div>
  )
}
