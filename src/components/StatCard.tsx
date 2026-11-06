import { Link } from 'react-router-dom'
export default function StatCard({ label, value, hint, to }: { label: string; value: string | number; hint?: string; to?: string }) {
  const body = (<><p className="text-3xl font-extrabold tracking-tight">{value}</p><p className="text-sm font-semibold">{label}</p>{hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}</>)
  const cls = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#131839]'
  return to ? <Link to={to} className={`${cls} block transition hover:-translate-y-0.5 hover:border-brand`}>{body}</Link> : <div className={cls}>{body}</div>
}
