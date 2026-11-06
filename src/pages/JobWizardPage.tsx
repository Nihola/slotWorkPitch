import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { jobService } from '../services/jobService'
import { STEPS, buildJob, emptyDraft, jobToDraft, validateStep, type Errors, type JobDraft } from '../features/jobwizard/draft'
import type { Job } from '../types'
import { BasicsStep, LocationStep, PayStep, PreviewStep, RequirementsStep, ScheduleStep, type StepProps } from '../features/jobwizard/steps'
import { t } from '../i18n'

const VIEWS: ((p: StepProps) => JSX.Element)[] = [BasicsStep, PayStep, LocationStep, RequirementsStep, ScheduleStep]
const COPY = [t('What are you hiring for?'), t('How much will you pay?'), t('Where is the work?'), t('Who are you looking for?'), t('When is the work?'), t('Review your listing')]

export default function JobWizardPage() {
  const { id } = useParams()
  return id ? <EditLoader id={id} /> : <WizardBody initial={emptyDraft()} />
}

/** Loads a returned job the employer owns and opens the wizard prefilled. */
function EditLoader({ id }: { id: string }) {
  const { session } = useAuth()
  const [job, setJob] = useState<Job | null | undefined>(undefined)
  useEffect(() => { jobService.getEmployerJobs().then(l => setJob(l.find(j => j.id === id) ?? null)).catch(() => setJob(null)) }, [id, session])
  if (job === undefined) return <div className="mx-auto h-72 max-w-2xl animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (!job || (job.moderation !== 'changes_requested' && job.moderation !== 'rejected'))
    return <div className="mx-auto max-w-lg rounded-2xl border p-8 text-center"><p className="font-bold">{t("This job can't be edited right now.")}</p><p className="text-muted">{t('Only jobs that were returned or rejected can be changed.')}</p><Link to="/employer/jobs" className="mt-3 inline-block font-bold text-brandfg">{t('Back to your jobs')}</Link></div>
  return <WizardBody key={job.id} initial={jobToDraft(job)} editId={job.id} note={job.moderationNote} />
}

function WizardBody({ initial, editId, note }: { initial: JobDraft; editId?: string; note?: string }) {
  const { session } = useAuth()
  const toast = useToast()
  const user = session!.user // RequireRole guarantees an employer session
  const [step, setStep] = useState(0)
  const [d, setD] = useState<JobDraft>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const head = useRef<HTMLHeadingElement>(null)
  useEffect(() => { head.current?.focus(); window.scrollTo({ top: 0 }) }, [step, submitted])

  const set: StepProps['set'] = (k, v) => { setD(s => ({ ...s, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const next = async () => {
    const e = validateStep(step, d); setErrors(e); setFail('')
    if (Object.keys(e).length) return
    if (step < STEPS.length - 2) { setStep(step + 1); return }
    if (step === STEPS.length - 2) { setStep(step + 1); return }
    setBusy(true)
    try {
      const job = editId ? await jobService.updateJob(editId, buildJob(user, d)) : await jobService.createJob(buildJob(user, d))
      setSubmitted(job.title); toast(editId ? t('Job resubmitted for review') : t('Job submitted for review'))
    }
    catch { setFail(t("We couldn't submit your job. Please try again.")) }
    finally { setBusy(false) }
  }
  const restart = () => { setD(emptyDraft()); setStep(0); setErrors({}); setSubmitted(null) }

  if (submitted) return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <CheckCircle2 size={56} className="mx-auto text-mintfg" />
      <h1 ref={head} tabIndex={-1} className="mt-4 text-3xl font-extrabold tracking-tight outline-none">{editId ? t('Resubmitted for review') : t('Submitted for review')}</h1>
      <p className="mt-2 text-muted">“{submitted}{t("” will go live once a moderator approves it. We'll show its status under Jobs.")}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2"><Link to="/employer/jobs" className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white">{t('View my jobs')}</Link>
        {editId ? <Link to="/employer/jobs/new" className="rounded-xl border border-slate-300 py-3 font-bold dark:border-slate-600">{t('Post another job')}</Link> : <button onClick={restart} className="rounded-xl border border-slate-300 py-3 font-bold dark:border-slate-600">{t('Post another job')}</button>}</div>
    </div>
  )
  const last = step === STEPS.length - 1
  return (
    <div className="mx-auto max-w-2xl pb-20">
      {editId && note && <p role="note" className="mb-5 rounded-2xl bg-sky-500/10 p-4 text-sm"><b>{t('Moderator note:')}</b> {note}</p>}
      <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        <div className="flex justify-between text-xs font-bold text-muted"><span>{t('Step')} {step + 1} {t('of')} {STEPS.length}</span><span>{STEPS[step]}</span></div>
        <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-2 rounded-full bg-gradient-to-r from-brand to-violet transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
      <h1 ref={head} tabIndex={-1} className="mb-6 mt-6 text-3xl font-extrabold tracking-tight outline-none">{COPY[step]}</h1>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]">
        {last ? <PreviewStep d={d} user={user} /> : (() => { const View = VIEWS[step]; return <View d={d} set={set} errors={errors} /> })()}
      </div>
      {fail && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{fail}</p>}
      <div className="mt-6 flex gap-3">
        {step > 0 && <button onClick={() => { setErrors({}); setStep(step - 1) }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold dark:border-slate-600"><ArrowLeft size={16} />{t('Back')}</button>}
        <button onClick={next} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Submitting…') : last ? (editId ? t('Resubmit for review') : t('Submit for review')) : step === STEPS.length - 2 ? t('Preview') : t('Continue')}</button>
      </div>
    </div>
  )
}
