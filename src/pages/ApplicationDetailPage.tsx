import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { ApplicationError, applicationService, FINAL } from '../services/applicationService'
import ApplicationStatus from '../components/ApplicationStatus'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import { shortDate } from '../utils/time'
import type { Application } from '../types'
import { t } from '../i18n'

export default function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [app, setApp] = useState<Application | null | undefined>(undefined)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { applicationService.get(id).then(a => setApp(a ?? null)).catch(() => setApp(null)) }, [id])
  useEffect(load, [load])
  if (app === undefined) return <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (app === null) return <div className="rounded-2xl border p-8 text-center"><p className="font-bold">{t("We couldn't find that application.")}</p><Link to="/applications" className="mt-3 inline-block font-bold text-brandfg">{t('Back to applications')}</Link></div>
  const withdraw = async () => {
    setBusy(true)
    try { await applicationService.withdraw(app.id); toast(t('Application withdrawn')); setConfirm(false); load() }
    catch (e) { toast(e instanceof ApplicationError ? e.message : t("We couldn't withdraw your application. Please try again.")) }
    finally { setBusy(false) }
  }
  const card = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'
  const notes = app.history.filter(h => h.note)
  return (
    <div className="grid gap-5 pb-16">
      <Link to="/applications" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted"><ArrowLeft size={16} />{t('All applications')}</Link>
      <header className={`${card} flex flex-wrap items-start gap-3`}>
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold tracking-tight">{app.jobTitle}</h1><p className="text-muted">{app.company}{app.shiftLabel ? ` · ${app.shiftLabel} shift (${app.shiftStart}:00–${app.shiftEnd}:00)` : ''}</p><p className="mt-1 text-sm text-muted">{t('Applied')} {shortDate(app.createdAt)}</p></div>
        <StatusBadge status={app.status} />
      </header>
      <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
        <section className={card} aria-labelledby="prog-h"><h2 id="prog-h" className="mb-4 text-lg font-extrabold">{t('Progress')}</h2><ApplicationStatus status={app.status} history={app.history} />
          {notes.length > 0 && <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">{notes.map(n => <li key={n.at}><b>{t('Note from')} {app.company}:</b> {n.note}</li>)}</ul>}</section>
        <aside className="grid gap-3">
          <Link to={`/messages?c=${app.conversationId}`} className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 text-center font-bold text-white">{t('Message employer')}</Link>
          <Link to={`/jobs/${app.jobId}`} className="rounded-xl border border-slate-300 py-3 text-center font-bold dark:border-slate-600">{t('View job')}</Link>
          {!FINAL.includes(app.status) && <button onClick={() => setConfirm(true)} className="rounded-xl border border-red-500/40 py-3 font-bold text-redfg">{t('Withdraw application')}</button>}
          {app.message && <div className={`${card} text-sm`}><b>{t('Your message')}</b><p className="mt-1 text-slate-600 dark:text-slate-300">“{app.message}”</p></div>}
        </aside>
      </div>
      {confirm && <Modal title={t('Withdraw this application?')} onClose={() => setConfirm(false)}><p className="text-sm text-muted">{app.company} {t("will be told you're no longer interested. You can apply again later.")}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => setConfirm(false)} className="rounded-xl border border-slate-300 py-3 font-bold dark:border-slate-600">{t('Keep it')}</button><button onClick={withdraw} disabled={busy} className="rounded-xl bg-redfill py-3 font-bold text-white disabled:opacity-60">{busy ? t('Withdrawing…') : t('Withdraw')}</button></div></Modal>}
    </div>
  )
}
