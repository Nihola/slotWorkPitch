import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Briefcase, CalendarCheck, Info, MessageSquare, Target, type LucideIcon } from 'lucide-react'
import { notificationService } from '../services/notificationService'
import { relativeTime } from '../utils/time'
import { notificationText } from '../i18n/notifications'
import type { Notification, NotificationCategory } from '../types'
import { t as tr } from '../i18n'

const CATS: [NotificationCategory | 'all', string, LucideIcon][] = [['all', tr('All'), Bell], ['applications', tr('Applications'), Briefcase], ['messages', tr('Messages'), MessageSquare], ['jobs', tr('Jobs'), Target], ['interviews', tr('Interviews'), CalendarCheck], ['system', tr('System'), Info]]
export default function NotificationsPage() {
    const nav = useNavigate()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [cat, setCat] = useState<NotificationCategory | 'all'>('all')
  const load = useCallback(() => { notificationService.list().then(setItems).catch(() => setItems(l => l ?? [])) }, [])
  useEffect(() => {
    load(); const t = setInterval(() => { if (!document.hidden) load() }, 15_000)
    window.addEventListener('slotwork:data', load); window.addEventListener('focus', load)
    return () => { clearInterval(t); window.removeEventListener('slotwork:data', load); window.removeEventListener('focus', load) }
  }, [load])
  const shown = items?.filter(n => cat === 'all' || n.category === cat) ?? []
  const unread = items?.filter(n => !n.read).length ?? 0
  const count = (c: NotificationCategory | 'all') => items?.filter(n => !n.read && (c === 'all' || n.category === c)).length ?? 0
  const open = async (n: Notification) => { await notificationService.markRead(n.id); if (n.link) nav(n.link) }
  return (
    <div className="grid gap-5 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-extrabold tracking-tight">{tr('Notifications')}</h1><p className="text-muted">{unread ? `${unread} unread` : tr("You're all caught up.")}</p></div>
        <button onClick={() => notificationService.markAllRead()} disabled={!unread} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:border-slate-600">{tr('Mark all as read')}</button></div>
      <div role="group" aria-label={tr('Filter by category')} className="flex flex-wrap gap-2">{CATS.map(([k, l]) => <button key={k} aria-pressed={cat === k} onClick={() => setCat(k)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${cat === k ? 'border-brand bg-brand text-white' : 'border-slate-300 dark:border-slate-600'}`}>{l}{count(k) > 0 ? ` (${count(k)})` : ''}</button>)}</div>
      {items === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      {items && shown.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><Bell className="mx-auto text-slate-400" /><p className="mt-2 font-bold">{cat === 'all' ? tr('No notifications yet.') : tr('Nothing here.')}</p><p className="text-muted">{tr('Updates about your applications, jobs, and messages show up here.')}</p></div>}
      <ul className="grid gap-2">{shown.map(n => { const Icon = CATS.find(c => c[0] === n.category)![2]; return (
        <li key={n.id}><button onClick={() => open(n)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-brand ${n.read ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#131839]' : 'border-brand/40 bg-brand/5'}`}>
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lav text-brandfg dark:bg-slate-800"><Icon size={16} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className={`block text-sm ${n.read ? '' : 'font-bold'}`}>{notificationText(n)}</span><span className="text-xs text-muted">{relativeTime(n.createdAt)}</span></span>
          {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label={tr('Unread')} />}</button></li>) })}</ul>
    </div>
  )
}
