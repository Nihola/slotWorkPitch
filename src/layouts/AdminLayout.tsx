import { useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, Flag, LayoutDashboard, LogOut, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useRouteFocus } from '../hooks/useRouteFocus'
import SkipLink from '../components/SkipLink'
import { t } from '../i18n'

const NAV: [string, string, LucideIcon][] = [
  ['/admin', t('Overview'), LayoutDashboard], ['/admin/moderation', t('Moderation'), ShieldCheck], ['/admin/reports', t('Reports'), Flag],
  ['/admin/jobs', t('Jobs'), Briefcase], ['/admin/users', t('Users'), Users], ['/admin/analytics', t('Analytics'), BarChart3],
]
/** Admins get their own dark workspace; the `dark` class makes shared components pick their dark styles. */
export default function AdminLayout() {
  const { session, logout } = useAuth()
  const nav = useNavigate()
  const main = useRef<HTMLElement>(null)
  useRouteFocus(main)
  const out = async () => { await logout(); nav('/', { replace: true }) }
  const link = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-violet/25 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`
  return (
    <div className="dark min-h-screen bg-[#070A1A] text-slate-100 lg:grid lg:grid-cols-[240px_1fr]">
      <SkipLink target={main} />
      <aside className="border-b border-white/10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-4">
        <div className="flex items-center justify-between p-4 lg:p-2">
          <div><p className="text-lg font-extrabold">{t('Slotwork')}</p><p className="text-xs font-bold text-cyanfg">{t('Admin')}</p></div>
          <button onClick={out} aria-label={t('Log out')} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 lg:hidden"><LogOut size={18} /></button>
        </div>
        <nav aria-label={t('Admin')} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0">
          {NAV.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'} className={link}><Icon size={18} aria-hidden="true" />{label}</NavLink>)}
        </nav>
        <div className="px-3 pb-3 lg:px-2"><LanguageSwitcher className="w-full" /></div>
        <div className="hidden items-center gap-2 border-t border-white/10 p-2 pt-4 lg:flex">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-400">{session?.user.name}</span>
          <button onClick={out} aria-label={t('Log out')} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 hover:bg-white/5"><LogOut size={18} /></button>
        </div>
      </aside>
      <main id="main" ref={main} tabIndex={-1} className="min-w-0 p-5 pb-16 outline-none lg:p-8"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
    </div>
  )
}
