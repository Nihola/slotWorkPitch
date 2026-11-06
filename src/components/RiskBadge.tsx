import { AlertTriangle } from 'lucide-react'
import type { RiskLevel } from '../utils/risk'
import { t } from '../i18n'
const S: Record<RiskLevel, [string, string]> = {
  low: [t('Low risk'), 'bg-emerald-500/15 text-mintfg'], medium: [t('Medium risk'), 'bg-amber-500/15 text-amberfg'], high: [t('High risk'), 'bg-red-500/15 text-redfg'],
}
export default function RiskBadge({ level }: { level: RiskLevel }) {
  const [label, cls] = S[level]
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>{level === 'high' && <AlertTriangle size={13} aria-hidden="true" />}{label}</span>
}
