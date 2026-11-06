import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { AuthError, authService } from '../services/authService'
import { t } from '../i18n'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)   // assume yes until the server says otherwise
  useEffect(() => { authService.getConfig().then(c => setEmailEnabled(c.emailEnabled)).catch(() => undefined) }, [])
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setErr(''); setBusy(true)
    try { await authService.requestPasswordReset(email); setSent(true) }
    catch (e) { setErr(e instanceof AuthError ? e.message : t("We couldn't send that request. Please try again.")) }
    finally { setBusy(false) }
  }
  return (
    <AuthShell title={t('Reset your password')} subtitle={t("Enter your email and we'll send you a link to choose a new password.")}>
      {!emailEnabled && <p role="alert" className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm font-semibold">{t("Email isn't set up on this server, so reset links can't be sent. Please contact the administrator.")}</p>}
      {sent ? (
        <div role="status" className="grid gap-4"><p className="rounded-2xl bg-mint/10 p-4 text-sm"><b>{t('Check your inbox.')}</b> {t("If an account exists for {email}, we've sent a link to reset your password. It expires in 1 hour. Check your spam folder too.", { email: email.trim() })}</p>
          <Link to="/login" className="font-bold text-brand">{t('Back to sign in')}</Link></div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <TextField id="email" label={t('Email')} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} error={err} />
          <button disabled={busy || !emailEnabled} className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Sending…') : t('Send reset link')}</button>
          <Link to="/login" className="text-center text-sm font-bold text-brand">{t('Back to sign in')}</Link>
        </form>
      )}
    </AuthShell>
  )
}
