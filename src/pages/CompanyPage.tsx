import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { SelectField, TextAreaField, TextField } from '../components/TextField'
import VerificationBadge from '../components/VerificationBadge'
import { AuthError } from '../services/authService'
import { jobService } from '../services/jobService'
import { applicationService } from '../services/applicationService'
import type { CompanyProfile } from '../types'
import { t } from '../i18n'

const card = 'rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#131839]'
const INDUSTRIES = ['Food & beverage', 'Education', 'Retail', 'Events', 'Customer support', 'Logistics', 'Office & admin', 'Other']
export default function CompanyPage() {
  const { session, updateCompany } = useAuth()
  const toast = useToast()
  const user = session!.user
  const [f, setF] = useState<CompanyProfile>(() => session!.company ?? { name: user.name, industry: '', city: '', website: '', description: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<{ posted: number; live: number; filled: number } | null>(null)
  useEffect(() => { Promise.all([jobService.getEmployerJobs(), applicationService.listForEmployer()]).then(([j, a]) => setStats({ posted: j.length, live: j.filter(x => x.moderation === 'approved').length, filled: a.filter(x => x.status === 'accepted').length })) }, [user.id])
  const set = (k: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(s => ({ ...s, [k]: e.target.value }))
  const save = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await updateCompany(f); toast(t('Company profile updated')) } catch (x) { setErr(x instanceof AuthError ? x.message : t("We couldn't save your profile. Please try again.")) }
    finally { setBusy(false) }
  }
  return (
    <div className="mx-auto grid max-w-3xl gap-5 pb-16">
      <header className={`${card} flex flex-wrap items-center gap-4`}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-violet text-2xl font-extrabold text-white" aria-hidden="true">{(f.name || user.name)[0]}</div>
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-extrabold tracking-tight">{f.name || user.name}</h1><VerificationBadge level="unverified" /></div>
        {stats && <dl className="flex gap-5 text-center text-sm"><div><dt className="text-muted">{t('Jobs posted')}</dt><dd className="text-xl font-extrabold">{stats.posted}</dd></div><div><dt className="text-muted">{t('Live now')}</dt><dd className="text-xl font-extrabold">{stats.live}</dd></div><div><dt className="text-muted">{t('Hired')}</dt><dd className="text-xl font-extrabold">{stats.filled}</dd></div></dl>}
      </header>
      <form onSubmit={save} noValidate className={`${card} grid gap-4`}>
        <h2 className="text-lg font-extrabold">{t('Company profile')}</h2>
        <TextField id="co-name" label={t('Company name')} value={f.name} onChange={set('name')} />
        <div className="grid gap-4 sm:grid-cols-2"><SelectField id="co-ind" label={t('Industry')} value={f.industry} onChange={set('industry')} options={INDUSTRIES} />
          <SelectField id="co-city" label={t('City')} value={f.city} onChange={set('city')} options={['Tashkent', 'Samarkand', 'Bukhara', 'Namangan', 'Andijan', 'Fergana']} /></div>
        <TextField id="co-web" label={t('Website (optional)')} type="url" placeholder={t('https://')} value={f.website} onChange={set('website')} />
        <TextAreaField id="co-desc" label={t('About your company')} rows={4} maxLength={1000} hint={`${f.description.length}/1000. Candidates read this before applying.`} value={f.description} onChange={set('description')} />
        {err && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-redfg">{err}</p>}
        <button disabled={busy} className="w-fit rounded-xl bg-gradient-to-br from-brand to-violet px-6 py-3 font-bold text-white disabled:opacity-60">{busy ? t('Saving…') : t('Save company profile')}</button>
      </form>
      <section className={card} aria-labelledby="vf-h"><h2 id="vf-h" className="text-lg font-extrabold">{t('Verification levels')}</h2><p className="mt-1 text-sm text-muted">{t('Verified employers are shown to candidates with a badge. New accounts start as unverified.')}</p>
        <ul className="mt-3 grid gap-2">{(['unverified', 'identity', 'business', 'trusted'] as const).map(l => <li key={l}><VerificationBadge level={l} /></li>)}</ul></section>
    </div>
  )
}
