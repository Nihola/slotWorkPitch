import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { moderationService } from '../../services/moderationService'
import { reportService } from '../../services/reportService'
import RiskBadge from '../../components/RiskBadge'
import { card } from './ui'
import type { Job } from '../../types'
import type { Risk } from '../../utils/risk'
import { t } from '../../i18n'

export default function AdminPage() {
  const [queue, setQueue] = useState<{ job: Job; risk: Risk }[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    Promise.all([moderationService.getQueue(), reportService.list()])
      .then(([items, reports]) => { setQueue(items); setOpen(reports.filter(x => x.status === 'open').length) })
      .catch(() => { setQueue([]); setOpen(0) })
  }, [])
  const kpis: [string, string][] = [
    ['Pending review', queue === null ? '…' : String(queue.length)], ['Open reports', open === null ? '…' : String(open)],
  ]
  return (
    <div className="grid gap-6">
      <div><h1 className="text-3xl font-extrabold tracking-tight">{t('Admin overview')}</h1><p className="text-slate-400">{t('Live counts from this demo workspace.')}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{kpis.map(([k, v]) => (
        <div key={k} className={card}><p className="text-3xl font-extrabold">{v}</p><p className="text-sm text-slate-400">{k}</p></div>))}</div>
      <section className={card} aria-label={t('Needs attention')}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{t('Needs your attention')}</h2><Link to="/admin/moderation" className="text-sm font-bold text-cyanfg">{t('Open queue')}</Link></div>
        {queue === null ? <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/5" /> : queue.length === 0 ? <p className="mt-3 text-slate-400">{t('Nothing is waiting for review.')}</p> : (
          <ul className="mt-3 grid gap-2">{queue.slice(0, 3).map(({ job, risk }) => (
            <li key={job.id}><Link to={`/admin/moderation/${job.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3 hover:bg-white/5">
              <span className="min-w-0 flex-1 truncate font-bold">{job.title}</span><span className="text-sm text-slate-400">{job.company}</span><RiskBadge level={risk.level} /></Link></li>))}</ul>)}
      </section>
    </div>
  )
}
