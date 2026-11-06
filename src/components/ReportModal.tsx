import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import Modal from './Modal'
import { REPORT_REASONS, ReportError, reportService } from '../services/reportService'
import { useToast } from '../context/ToastContext'
import type { Job, Report } from '../types'
import { t } from '../i18n'

export default function ReportModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState<Report['reason'] | ''>('')
  const [details, setDetails] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const submit = async () => {
    if (!reason) { setErr(t('Choose a reason for your report.')); return }
    setBusy(true); setErr('')
    try { await reportService.create({ targetId: job.id, reason, details }); setDone(true); toast(t('Report sent. Thank you.')) }
    catch (e) { setErr(e instanceof ReportError ? e.message : t("We couldn't send your report. Please try again.")) }
    finally { setBusy(false) }
  }
  if (done) return (
    <Modal title={t('Report received')} onClose={onClose}>
      <p className="flex items-center gap-2 text-mintfg"><CheckCircle2 size={20} /><b>{t('Thanks for helping keep Slotwork safe.')}</b></p>
      <p className="mt-2 text-sm text-muted">{t('Our moderators will review “')}{job.title}{t("”. We won't share your name with the employer.")}</p>
      <button onClick={onClose} className="mt-5 w-full rounded-xl bg-brand py-3 font-bold text-white">{t('Done')}</button>
    </Modal>
  )
  return (
    <Modal title={t('Report this job')} onClose={onClose}>
      <p className="text-sm text-muted">{job.title} · {job.company}</p>
      <fieldset className="mt-4"><legend className="text-sm font-bold">{t("What's wrong?")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{REPORT_REASONS.map(r => (
          <label key={r.id} className={`cursor-pointer rounded-xl border p-3 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${reason === r.id ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <input type="radio" name="reason" className="sr-only" checked={reason === r.id} onChange={() => { setReason(r.id); setErr('') }} />{r.label}</label>))}</div>
      </fieldset>
      <label htmlFor="report-details" className="mt-4 block text-sm font-bold">{t('Tell us more (optional)')}</label>
      <textarea id="report-details" rows={3} maxLength={1000} value={details} onChange={e => setDetails(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" />
      {err && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-xl bg-redfill py-3 font-bold text-white disabled:opacity-60">{busy ? t('Sending…') : t('Send report')}</button>
    </Modal>
  )
}
