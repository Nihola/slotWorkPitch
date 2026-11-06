import { useState } from 'react'
import { CheckCircle2, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import MatchScore from './MatchScore'
import ApplicationStatus from './ApplicationStatus'
import { ApplicationError, applicationService } from '../services/applicationService'
import { scheduleCompatibility } from '../utils/matching'
import { useSeeker } from '../context/SeekerContext'
import { useToast } from '../context/ToastContext'
import type { Application, Job } from '../types'
import { t } from '../i18n'

export default function ApplyModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { seeker } = useSeeker()
  const toast = useToast()
  const shifts = job.schedule.shifts
  const [shiftId, setShiftId] = useState<string | undefined>(shifts[0]?.id)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Application | null>(null)
  const [err, setErr] = useState('')
  const shift = shifts.find(s => s.id === shiftId)
  const target = shift ? { ...job, schedule: { ...job.schedule, startHour: shift.startHour, endHour: shift.endHour } } : job
  const fit = Math.round(scheduleCompatibility(target, seeker.availability).ratio * 100)

  const submit = async () => {
    setBusy(true); setErr('')
    try { setDone(await applicationService.apply({ job, shiftId, message })); toast(t('Application submitted')) }
    catch (e) { setErr(e instanceof ApplicationError ? e.message : t("We couldn't send your application. Please try again.")) }
    finally { setBusy(false) }
  }

  if (done) return (
    <Modal title={t('Application submitted successfully')} onClose={onClose}>
      <p className="mb-4 flex items-center gap-2 text-mintfg"><CheckCircle2 size={20} /><span className="font-semibold">{job.company} {t('will review it soon.')}</span></p>
      <ApplicationStatus status="submitted" history={done.history} />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link to={`/applications/${done.id}`} onClick={onClose} className="rounded-xl bg-brand py-3 text-center font-bold text-white">{t('View application')}</Link>
        <Link to={`/messages?c=${done.conversationId}`} onClick={onClose} className="rounded-xl border border-slate-300 py-3 text-center font-bold dark:border-slate-600">{t('Open conversation')}</Link>
      </div>
      <Link to="/jobs" onClick={onClose} className="mt-3 block text-center text-sm font-bold text-brandfg">{t('Browse more jobs')}</Link>
    </Modal>
  )
  return (
    <Modal title={`Apply: ${job.title}`} onClose={onClose}>
      <p className="text-sm text-muted">{job.company} · {job.district || job.city}</p>
      {shifts.length > 0 && (
        <fieldset className="mt-4"><legend className="mb-2 text-sm font-bold">{t('Choose a shift')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {shifts.map(s => (
              <label key={s.id} className={`cursor-pointer rounded-xl border p-3 text-sm ${shiftId === s.id ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'}`}>
                <input type="radio" name="shift" className="sr-only" checked={shiftId === s.id} onChange={() => setShiftId(s.id)} />
                <b>{s.label}</b><br /><span className="text-muted">{s.startHour}:00–{s.endHour}:00</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-lav p-3 dark:bg-slate-800/60">
        <MatchScore value={fit} size={48} />
        <p className="text-sm"><b>{fit === 100 ? t('Your availability covers this shift.') : fit === 0 ? t('This shift is outside your availability.') : `Your availability covers ${fit}% of this shift.`}</b>
          <br /><span className="text-muted">{t('Update your availability any time from the jobs page.')}</span></p>
      </div>
      <div className="mt-4 text-sm"><b>{t('Skills shared with this job')}</b>
        <p className="mt-1 flex flex-wrap gap-2">{job.skills.map(s => <span key={s} className={`rounded-full px-3 py-0.5 text-xs font-bold ${seeker.skills.map(x => x.toLowerCase()).includes(s.toLowerCase()) ? 'bg-mint/15 text-mintfg' : 'bg-slate-100 text-muted dark:bg-slate-800'}`}>{s}</span>)}</p></div>
      <p className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><FileText size={16} />{t('CV_Dilnoza.pdf attached')}</p>
      <label className="mt-4 block text-sm font-bold" htmlFor="msg">{t('Message to employer (optional)')}</label>
      <textarea id="msg" rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder={t('Say what makes you a good fit.')}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" />
      {err && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Sending…') : t('Submit application')}</button>
    </Modal>
  )
}
