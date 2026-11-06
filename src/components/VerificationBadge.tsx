import { Award, BadgeCheck, CircleHelp, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { VerificationLevel } from '../types'
import { t } from '../i18n'
const LEVELS: Record<VerificationLevel, { label: string; cls: string; Icon: LucideIcon }> = {
  unverified: { label: t('Unverified'), cls: 'text-muted', Icon: CircleHelp },
  identity: { label: t('Identity verified'), cls: 'text-cyanfg', Icon: BadgeCheck },
  business: { label: t('Business verified'), cls: 'text-brandfg', Icon: ShieldCheck },
  trusted: { label: t('Trusted employer'), cls: 'text-mintfg', Icon: Award },
}
export const verificationLabel = (l: VerificationLevel) => LEVELS[l].label
/** One badge, used the same way everywhere a verification state is shown. */
export default function VerificationBadge({ level }: { level: VerificationLevel }) {
  const { label, cls, Icon } = LEVELS[level]
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${cls}`}><Icon size={14} aria-hidden="true" />{label}</span>
}
