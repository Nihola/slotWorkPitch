import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { STEPS, buildProfile, initialDraft, profileStrength, validateStep, type Errors, type OnboardingDraft } from '../features/onboarding/draft'
import { AvailabilityStep, ExperienceStep, JobTypesStep, LocationStep, PersonalStep, SkillsStep, type StepProps } from '../features/onboarding/steps'
import type { JobSeeker } from '../types'
import { t } from '../i18n'

const VIEWS: ((p: StepProps) => JSX.Element)[] = [PersonalStep, SkillsStep, ExperienceStep, JobTypesStep, LocationStep, AvailabilityStep]
const COPY = [t('Tell us about you'), t('What are you good at?'), t('Your background'), t('What kind of work do you want?'), t('Where are you based?'), t('When can you work?')]

export default function OnboardingPage() {
  const { session, completeOnboarding } = useAuth()
  const nav = useNavigate()
  const user = session!.user // RequireRole guarantees a seeker session
  const [step, setStep] = useState(0)
  const [d, setD] = useState<OnboardingDraft>(() => initialDraft(user.name, session!.profile))
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  const [done, setDone] = useState<JobSeeker | null>(null)
  const head = useRef<HTMLHeadingElement>(null)
  useEffect(() => { head.current?.focus(); window.scrollTo({ top: 0 }) }, [step, done])

  const set: StepProps['set'] = (k, v) => { setD(s => ({ ...s, [k]: v })); setErrors(e => ({ ...e, [k === 'cells' ? 'cells' : k]: undefined })) }
  const next = async () => {
    const e = validateStep(step, d); setErrors(e); setFail('')
    if (Object.keys(e).length) return
    if (step < STEPS.length - 1) { setStep(step + 1); return }
    setBusy(true)
    try { const p = buildProfile(user, d); await completeOnboarding(p); setDone(p) }
    catch { setFail(t("We couldn't save your profile. Please try again.")) }
    finally { setBusy(false) }
  }

  if (done) {
    const strength = profileStrength(done)
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-mintfg" />
        <h1 ref={head} tabIndex={-1} className="mt-4 text-3xl font-extrabold tracking-tight outline-none">{t('Your profile is ready!')}</h1>
        <p className="mt-2 text-muted">{t("We'll rank jobs by how well they fit your")} {done.availability.reduce((n, a) => n + a.endHour - a.startHour, 0)} {t('weekly hours.')}</p>
        <div className="mx-auto mt-6 max-w-xs text-left"><div className="flex justify-between text-sm font-bold"><span>{t('Profile strength')}</span><span>{strength}%</span></div>
          <div className="mt-1 h-3 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-3 rounded-full bg-gradient-to-r from-brand to-violet transition-all duration-700" style={{ width: `${strength}%` }} /></div></div>
        <button onClick={() => nav('/jobs')} className="mt-8 w-full rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white">{t('See jobs that fit')}</button>
      </div>
    )
  }
  const View = VIEWS[step]
  return (
    <div className="mx-auto max-w-2xl pb-20">
      <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        <div className="flex justify-between text-xs font-bold text-muted"><span>{t('Step')} {step + 1} {t('of')} {STEPS.length}</span><span>{STEPS[step]}</span></div>
        <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-2 rounded-full bg-gradient-to-r from-brand to-violet transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>
      <h1 ref={head} tabIndex={-1} className="mb-6 mt-6 text-3xl font-extrabold tracking-tight outline-none">{COPY[step]}</h1>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]"><View d={d} set={set} errors={errors} /></div>
      {fail && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{fail}</p>}
      <div className="mt-6 flex gap-3">
        {step > 0 && <button onClick={() => { setErrors({}); setStep(step - 1) }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold dark:border-slate-600"><ArrowLeft size={16} />{t('Back')}</button>}
        <button onClick={next} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Saving…') : step === STEPS.length - 1 ? t('Finish profile') : t('Continue')}</button>
      </div>
    </div>
  )
}
