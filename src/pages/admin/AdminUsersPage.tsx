import { useEffect, useState } from 'react'
import { authService } from '../../services/authService'
import { card } from './ui'
import type { Role, User } from '../../types'
import { t } from '../../i18n'

type Row = User & { onboarded: boolean }
const ROLE_CLS: Record<Role, string> = { seeker: 'bg-sky-500/15 text-skyfg', employer: 'bg-violet/20 text-violetfg', admin: 'bg-amber-500/15 text-amberfg' }
export default function AdminUsersPage() {
  const [users, setUsers] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [error, setError] = useState(false)
  useEffect(() => { authService.listUsers().then(setUsers).catch(() => setError(true)) }, [])
  const shown = users?.filter(u => (role === 'all' || u.role === role) && `${u.name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())) ?? []
  return (
    <div className="grid gap-5">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Users')}</h1><p className="text-slate-400">{t('All registered accounts. Read-only for now.')}</p></div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1"><label htmlFor="user-search" className="sr-only">{t('Search users')}</label><input id="user-search" type="search" placeholder={t('Search by name or email')} value={q} onChange={e => setQ(e.target.value)} className="w-full rounded-xl border border-white/15 bg-[#0F1430] px-3 py-2.5 text-sm" /></div>
        <label className="text-sm font-bold">{t('Role')} <select value={role} onChange={e => setRole(e.target.value as Role | 'all')} className="ml-2 rounded-xl border border-white/15 bg-[#0F1430] px-3 py-2.5"><option value="all">{t('All')}</option><option value="seeker">{t('Job seekers')}</option><option value="employer">{t('Employers')}</option><option value="admin">{t('Admins')}</option></select></label>
      </div>
      {error && <div className={`${card} text-center`}><p className="font-bold">{t('Something went wrong.')}</p><p className="text-slate-400">{t("We couldn't load users. Please try again.")}</p></div>}
      {!error && users === null && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}
      {users && shown.length === 0 && <div className={`${card} border-dashed text-center`}><p className="font-bold">{t('No users match your search.')}</p></div>}
      <ul className="grid gap-2">{shown.map(u => (
        <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0F1430] p-4">
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{u.name}</p><p className="truncate text-sm text-slate-400">{u.email}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${ROLE_CLS[u.role]}`}>{u.role === 'seeker' ? t('Job seeker') : u.role}</span>
          {u.role === 'seeker' && <span className="text-xs text-muted">{u.onboarded ? t('Profile complete') : t('Onboarding unfinished')}</span>}
        </li>))}</ul>
    </div>
  )
}
