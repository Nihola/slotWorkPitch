import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { TextField } from '../components/TextField'
import { AuthError } from '../services/authService'
import { DEFAULT_PREFS, notificationService, type PrefKey, type Prefs } from '../services/notificationService'
import { getThemePref, setThemePref, type ThemePref } from '../utils/theme'
import { t as tr } from '../i18n'

const card = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'
const PREF_LABELS: [PrefKey, string][] = [['applications', 'Application updates'], ['messages', 'New messages'], ['jobs', 'Job activity'], ['interviews', 'Interview invitations']]
export default function SettingsPage() {
  const { session, updateName, changePassword } = useAuth()
  const toast = useToast()
  const user = session!.user
  const [theme, setTheme] = useState<ThemePref>(getThemePref)
  const [prefs, setP] = useState<Prefs>(DEFAULT_PREFS)
  useEffect(() => { notificationService.getPrefs().then(setP).catch(() => undefined) }, [])
  const [name, setName] = useState(user.name)
  const [nameErr, setNameErr] = useState('')
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwErr, setPwErr] = useState('')
  const [busy, setBusy] = useState(false)

  const saveName = async (e: FormEvent) => {
    e.preventDefault(); setNameErr('')
    try { await updateName(name); toast(tr('Profile updated')) } catch (err) { setNameErr(err instanceof AuthError ? err.message : tr("We couldn't save that. Please try again.")) }
  }
  const savePw = async (e: FormEvent) => {
    e.preventDefault(); setPwErr(''); setBusy(true)
    try { await changePassword(pw.current, pw.next); setPw({ current: '', next: '' }); toast(tr('Password changed')) } catch (err) { setPwErr(err instanceof AuthError ? err.message : tr("We couldn't change your password. Please try again.")) }
    finally { setBusy(false) }
  }
  const togglePref = (k: PrefKey) => { const before = prefs, next = { ...prefs, [k]: !prefs[k] }; setP(next); notificationService.setPrefs(next).catch(() => { setP(before); toast(tr("We couldn't save that setting. Please try again.")) }) }
  return (
    <div className="mx-auto grid max-w-2xl gap-5 pb-16">
      <h1 className="text-3xl font-extrabold tracking-tight">{tr('Settings')}</h1>
      <section className={card} aria-labelledby="ap-h"><h2 id="ap-h" className="text-lg font-extrabold">{tr('Appearance')}</h2>
        <div role="radiogroup" aria-label={tr('Theme')} className="mt-3 inline-flex rounded-xl border border-slate-300 p-1 dark:border-slate-600">{(['light', 'dark', 'system'] as const).map(t => (
          <button key={t} role="radio" aria-checked={theme === t} onClick={() => { setTheme(t); setThemePref(t) }} className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize ${theme === t ? 'bg-brand text-white' : ''}`}>{t}</button>))}</div></section>
      <section className={card} aria-labelledby="nt-h"><h2 id="nt-h" className="text-lg font-extrabold">{tr('Notifications')}</h2><p className="text-sm text-muted">{tr('Choose what appears in your notification centre. System messages are always on.')}</p>
        <ul className="mt-3 grid gap-2">{PREF_LABELS.map(([k, l]) => <li key={k}><label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-700">{l}<input type="checkbox" role="switch" checked={prefs[k]} onChange={() => togglePref(k)} className="h-5 w-5 accent-brand" /></label></li>)}</ul></section>
      <section className={card} aria-labelledby="ac-h"><h2 id="ac-h" className="text-lg font-extrabold">{tr('Account')}</h2>
        <form onSubmit={saveName} noValidate className="mt-3 grid gap-3"><TextField id="acc-name" label={user.role === 'employer' ? tr('Company or contact name') : tr('Full name')} value={name} onChange={e => setName(e.target.value)} error={nameErr} />
          <TextField id="acc-email" label={tr('Email')} value={user.email} readOnly hint={tr("Your email can't be changed in this prototype.")} /><button className="w-fit rounded-xl bg-brand px-5 py-2.5 font-bold text-white">{tr('Save changes')}</button></form></section>
      <section className={card} aria-labelledby="pw-h"><h2 id="pw-h" className="text-lg font-extrabold">{tr('Change password')}</h2>
        <form onSubmit={savePw} noValidate className="mt-3 grid gap-3"><TextField id="pw-cur" type="password" autoComplete="current-password" label={tr('Current password')} value={pw.current} onChange={e => setPw(s => ({ ...s, current: e.target.value }))} />
          <TextField id="pw-new" type="password" autoComplete="new-password" label={tr('New password')} hint={tr('At least 8 characters, including a number.')} value={pw.next} onChange={e => setPw(s => ({ ...s, next: e.target.value }))} />
          {pwErr && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{pwErr}</p>}<button disabled={busy} className="w-fit rounded-xl bg-brand px-5 py-2.5 font-bold text-white disabled:opacity-60">{busy ? tr('Saving…') : tr('Change password')}</button></form></section>
    </div>
  )
}
