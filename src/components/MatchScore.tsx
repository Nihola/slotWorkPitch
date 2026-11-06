import { matchLabel } from '../utils/matching'
const tone = (p: number) => (p >= 85 ? '#14B87E' : p >= 65 ? '#3B5BFF' : '#F5A100')
export default function MatchScore({ value, size = 56, showLabel = false }: { value: number; size?: number; showLabel?: boolean }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${value}% ${matchLabel(value)}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone(value)} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="rotate-90 origin-center fill-current text-[13px] font-bold">{value}%</text>
      </svg>
      {showLabel && <span className="text-sm font-semibold">{matchLabel(value)}</span>}
    </div>
  )
}
