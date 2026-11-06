import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBadges } from '../hooks/useBadges'
import { useRouteFocus } from '../hooks/useRouteFocus'
import SkipLink from '../components/SkipLink'
import { homeFor } from '../utils/access'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { setThemePref } from '../utils/theme'
import { t } from '../i18n'

type L = { to: string; label: string; end?: boolean; badge?: 'messages' }
const SEEKER: L[] = [{ to: '/dashboard', label: t('Dashboard') }, { to: '/jobs', label: t('Find jobs') }, { to: '/saved', label: t('Saved') }, { to: '/applications', label: t('Applications') }, { to: '/messages', label: t('Messages'), badge: 'messages' }, { to: '/profile', label: t('Profile') }]
const EMPLOYER: L[] = [{ to: '/employer', label: t('Overview'), end: true }, { to: '/employer/jobs', label: t('Jobs'), end: true }, { to: '/employer/jobs/new', label: t('Post a job') }, { to: '/employer/applications', label: t('Applications') }, { to: '/employer/candidates', label: t('Candidates') }, { to: '/employer/messages', label: t('Messages'), badge: 'messages' }, { to: '/employer/company', label: t('Company') }]

export default function AppLayout() {
  const { session, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const main = useRef<HTMLElement>(null)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useRouteFocus(main)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const role = session?.user.role
  const badges = useBadges(session?.user.id)
  const links = !session ? [] : role === 'seeker' ? (session.onboarded ? SEEKER : []) : role === 'employer' ? EMPLOYER : []
  const notifPath = role === 'employer' ? '/employer/notifications' : '/notifications'
  useEffect(() => setOpen(false), [loc.pathname, loc.search])
  useEffect(() => { const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark'))); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => o.disconnect() }, [])
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h) }, [open])

  useEffect(() => { if (open) closeBtn.current?.focus() }, [open])
  const closeMenu = () => { setOpen(false); menuBtn.current?.focus() }
  const toggleTheme = () => { const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'; setThemePref(next); setDark(next === 'dark') }
  const out = async () => { await logout(); nav('/', { replace: true }) }
  const btn = 'relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-slate-700'
  const item = (_l: L) => ({ isActive }: { isActive: boolean }) => `flex items-center gap-1.5 rounded-lg px-2 py-2 ${isActive ? 'bg-brand/10 text-brandfg' : 'text-muted hover:text-ink dark:hover:text-white'}`
  const dot = (l: L) => (l.badge === 'messages' && badges.messages > 0 ? <>{' '}<span className="rounded-full bg-redfill px-1.5 text-[10px] font-extrabold text-white">{badges.messages}</span><span className="sr-only"> {t('unread')}</span></> : null)
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5">
      <SkipLink target={main} />
      <header className="flex items-center gap-1.5 py-4">
        <Link to={homeFor(session)} className="mr-auto text-xl font-extrabold">{t('Slotwork')}</Link>
        {links.length > 0 && <nav aria-label={t('Main')} className="hidden gap-0.5 text-sm font-bold xl:flex">{links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={item(l)}>{l.label}{dot(l)}</NavLink>)}</nav>}
        {!session && <nav aria-label={t('Main')} className="flex gap-1 text-sm font-bold"><Link to="/login" className="rounded-lg px-3 py-2 text-muted">{t('Log in')}</Link><Link to="/register" className="rounded-lg bg-brand px-3 py-2 text-white">{t('Get started')}</Link></nav>}
        {session && role !== 'admin' && (<>
          <Link to={notifPath} aria-label={badges.notifications ? `Notifications, ${badges.notifications} unread` : t('Notifications')} className={btn}><Bell size={18} />{badges.notifications > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-redfill px-1 text-[10px] font-extrabold text-white">{badges.notifications}</span>}</Link>
          <Link to="/settings" aria-label={t('Settings')} className={`${btn} hidden xl:grid`}><Settings size={18} /></Link>
        </>)}
        <LanguageSwitcher className="hidden sm:block" />
        <button onClick={toggleTheme} aria-label={dark ? t('Switch to light mode') : t('Switch to dark mode')} className={btn}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        {session && <button onClick={out} aria-label={t('Log out')} className={btn}><LogOut size={18} /></button>}
        {links.length > 0 && <button ref={menuBtn} onClick={() => setOpen(true)} aria-label={t('Open menu')} aria-expanded={open} className={`${btn} xl:hidden`}><Menu size={18} /></button>}
      </header>
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={closeMenu} className="absolute inset-0 cursor-default bg-ink/60" />
          <nav aria-label={t('Mobile menu')} className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col gap-1 overflow-y-auto bg-white p-4 dark:bg-[#0F1330]">
            <button ref={closeBtn} onClick={closeMenu} aria-label={t('Close menu')} className={`${btn} mb-2 self-end`}><X size={18} /></button>
            {links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={item(l)}>{l.label}{dot(l)}</NavLink>)}
            <NavLink to="/settings" className={item({ to: '/settings', label: 'Settings' })}>{t('Settings')}</NavLink>
          </nav>
        </div>
      )}
      <main id="main" ref={main} tabIndex={-1} className="flex-1 outline-none"><Outlet /></main>
      <footer className="py-6 text-center text-xs text-muted flex flex-col items-center gap-3"><span>{t('Slotwork · demo companies and people are fictional')}</span><LanguageSwitcher /></footer>
    </div>
  )
}
