import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { AuthError, DEMO_PASSWORD } from '../services/authService'
import { validateEmail } from '../utils/validation'
import { t } from '../i18n'

const DEMOS = [[t('Job seeker'), 'seeker@demo.test'], [t('Employer'), 'employer@demo.test'], [t('Admin'), 'admin@demo.test']]
export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setFormErr('')
    const e = { email: validateEmail(email) || undefined, password: password ? undefined : 'Enter your password.' }
    setErrs(e); if (e.email || e.password) return
    setBusy(true)
    try { await login(email, password) } // GuestOnly redirects once the session exists
    catch (err) { setFormErr(err instanceof AuthError ? err.message : t("We couldn't sign you in. Please try again.")) }
    finally { setBusy(false) }
  }
  return (
    <AuthShell title={t('Welcome back')} subtitle="Sign in to see work that fits your week.">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <TextField id="email" label={t('Email')} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} error={errs.email} />
        <TextField id="password" label={t('Password')} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} error={errs.password} />
        {formErr && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{formErr}</p>}
        <button disabled={busy} className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Signing in…') : t('Sign in')}</button>
        <div className="flex justify-between text-sm"><Link to="/forgot-password" className="font-semibold text-brandfg">{t('Forgot password?')}</Link><Link to="/register" className="font-semibold text-brandfg">{t('Create an account')}</Link></div>
      </form>
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-600">
        <p className="font-bold">{t('Try a demo account')}</p><p className="text-muted">{t('Password for all:')} {DEMO_PASSWORD}</p>
        <div className="mt-2 flex flex-wrap gap-2">{DEMOS.map(([l, m]) => <button key={m} type="button" onClick={() => { setEmail(m); setPassword(DEMO_PASSWORD); setErrs({}) }} className="rounded-lg bg-lav px-3 py-1.5 font-bold dark:bg-slate-800">{l}</button>)}</div>
      </div>
    </AuthShell>
  )
}
