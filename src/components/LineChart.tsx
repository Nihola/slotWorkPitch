import { useId } from 'react'
interface Props { title: string; labels: string[]; values: number[]; color: string }
const fmt = (n: number) => n.toLocaleString('en-US')
/** Small dependency-free area chart with an accessible text summary. */
export default function LineChart({ title, labels, values, color }: Props) {
  const gid = useId().replace(/:/g, '')
  const W = 300, H = 110, pad = 6
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (W - pad * 2), H - pad - ((v - min) / span) * (H - pad * 2 - 8)] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const first = values[0], last = values[values.length - 1], delta = first ? Math.round(((last - first) / first) * 100) : 0
  return (
    <figure className="rounded-2xl border border-white/10 bg-[#0F1430] p-4">
      <figcaption className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-300">{title}</span>
        <span className={`text-xs font-bold ${delta >= 0 ? 'text-mintfg' : 'text-redfg'}`}>{delta >= 0 ? '+' : ''}{delta}%</span>
      </figcaption>
      <p className="text-2xl font-extrabold text-white">{fmt(last)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${labels[0]} ${fmt(first)}, ${labels[labels.length - 1]} ${fmt(last)}`} className="mt-2 w-full">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`${pad},${H - pad} ${line} ${W - pad},${H - pad}`} fill={`url(#${gid})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span></div>
    </figure>
  )
}
