import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { AuthError, authService } from '../services/authService'
import { validatePassword } from '../utils/validation'
import { t } from '../i18n'

type State = 'checking' | 'invalid' | 'form' | 'done'
export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? ''
  const [state, setState] = useState<State>('checking')
  const [pw, setPw] = useState({ next: '', again: '' }); const [errs, setErrs] = useState<{ next?: string; again?: string }>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false)
  // Find out if the link is still good before asking for a password. If the check itself fails (offline), show the form; the server decides on submit.
  useEffect(() => { if (!token) { setState('invalid'); return } authService.checkResetToken(token).then(v => setState(v ? 'form' : 'invalid')).catch(() => setState('form')) }, [token])

  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setFormErr('')
    const e = { next: validatePassword(pw.next) || undefined, again: pw.next !== pw.again ? t("Passwords don't match.") : undefined }
    setErrs(e); if (e.next || e.again) return
    setBusy(true)
    try { await authService.resetPassword(token, pw.next); setState('done') }
    catch (err) {
      if (err instanceof AuthError && err.message === t('This reset link is invalid or has expired. Request a new one.')) setState('invalid')
      else setFormErr(err instanceof AuthError ? err.message : t("We couldn't change your password. Please try again."))
    } finally { setBusy(false) }
  }
  if (state === 'checking') return <AuthShell title={t('Choose a new password')} subtitle=""><div role="status" className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"><span className="sr-only">{t('Checking your link…')}</span></div></AuthShell>
  if (state === 'invalid') return (
    <AuthShell title={t('Choose a new password')} subtitle="">
      <p role="alert" className="rounded-2xl bg-red-500/10 p-4 text-sm font-semibold">{t('This reset link is invalid or has expired. Request a new one.')}</p>
      <Link to="/forgot-password" className="mt-4 inline-block rounded-xl bg-brand px-5 py-3 font-bold text-white">{t('Request a new link')}</Link>
    </AuthShell>)
  if (state === 'done') return (
    <AuthShell title={t('Password updated')} subtitle="">
      <p role="status" className="rounded-2xl bg-mint/10 p-4 text-sm">{t('Your password was changed and you were signed out everywhere. Sign in with your new password.')}</p>
      <Link to="/login" className="mt-4 inline-block rounded-xl bg-gradient-to-br from-brand to-violet px-5 py-3 font-bold text-white">{t('Sign in')}</Link>
    </AuthShell>)
  return (
    <AuthShell title={t('Choose a new password')} subtitle={t("Pick a strong password you haven't used before.")}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="new-password" label={t('New password')} type="password" autoComplete="new-password" hint={t('At least 8 characters, including a number.')} value={pw.next} onChange={e => setPw(s => ({ ...s, next: e.target.value }))} error={errs.next} />
        <TextField id="confirm-password" label={t('Confirm new password')} type="password" autoComplete="new-password" value={pw.again} onChange={e => setPw(s => ({ ...s, again: e.target.value }))} error={errs.again} />
        {formErr && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-500">{formErr}</p>}
        <button disabled={busy} className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Saving…') : t('Set new password')}</button>
      </form>
    </AuthShell>)
}
