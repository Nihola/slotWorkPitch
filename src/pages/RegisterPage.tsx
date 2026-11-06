import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Briefcase, Search } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { TextField } from '../components/TextField'
import { useAuth } from '../context/AuthContext'
import { AuthError } from '../services/authService'
import { validateEmail, validatePassword } from '../utils/validation'
import type { Role } from '../types'
import { t } from '../i18n'

const ROLES: { id: Role; label: string; text: string; Icon: typeof Search }[] = [
  { id: 'seeker', label: t('Job seeker'), text: t('Find work that fits my schedule'), Icon: Search },
  { id: 'employer', label: t('Employer'), text: t('Hire people for the hours I need'), Icon: Briefcase },
]
export default function RegisterPage() {
  const { register } = useAuth()
  const [params] = useSearchParams()
  const [role, setRole] = useState<Role | ''>(params.get('role') === 'employer' ? 'employer' : params.get('role') === 'seeker' ? 'seeker' : '')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [errs, setErrs] = useState<Record<string, string | undefined>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF(s => ({ ...s, [k]: e.target.value }))
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setFormErr('')
    const e = { role: role ? undefined : 'Choose what you are looking for.', name: f.name.trim().length < 2 ? 'Enter your name.' : undefined, email: validateEmail(f.email) || undefined, password: validatePassword(f.password) || undefined }
    setErrs(e); if (Object.values(e).some(Boolean) || !role) return
    setBusy(true)
    try { await register({ ...f, role }) }
    catch (err) { setFormErr(err instanceof AuthError ? err.message : t("We couldn't create your account. Please try again.")) }
    finally { setBusy(false) }
  }
  return (
    <AuthShell title={t('Create your account')} subtitle="It takes about two minutes.">
      <form onSubmit={submit} noValidate className="grid gap-4">
        <fieldset><legend className="text-sm font-bold">{t('What are you looking for?')}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{ROLES.map(({ id, label, text, Icon }) => (
            <label key={id} className={`cursor-pointer rounded-2xl border-2 p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${role === id ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="role" value={id} checked={role === id} onChange={() => { setRole(id); setErrs(s => ({ ...s, role: undefined })) }} className="sr-only" />
              <Icon size={20} className={role === id ? 'text-brandfg' : 'text-slate-400'} /><b className="mt-2 block">{label}</b><span className="text-sm text-muted">{text}</span>
            </label>))}</div>
          {errs.role && <p role="alert" className="mt-1 text-xs font-semibold text-redfg">{errs.role}</p>}
        </fieldset>
        <TextField id="name" label={role === 'employer' ? t('Company or contact name') : t('Full name')} autoComplete="name" value={f.name} onChange={set('name')} error={errs.name} />
        <TextField id="email" label={t('Email')} type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errs.email} />
        <TextField id="password" label={t('Password')} type="password" autoComplete="new-password" hint={t('At least 8 characters, including a number.')} value={f.password} onChange={set('password')} error={errs.password} />
        {formErr && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{formErr}</p>}
        <button disabled={busy} className="rounded-xl bg-gradient-to-br from-brand to-violet py-3 font-bold text-white disabled:opacity-60">{busy ? t('Creating account…') : t('Create account')}</button>
        <p className="text-center text-sm text-muted">{t('Already have an account?')} <Link to="/login" className="font-bold text-brandfg">{t('Sign in')}</Link></p>
      </form>
    </AuthShell>
  )
}
