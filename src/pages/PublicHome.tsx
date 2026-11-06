import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../utils/access'
import { Audiences, Featured, FinalCta, Hero, HowItWorks, ShiftDemo, Stats, Trust, WhyAvailability, scrollTo } from '../features/landing/sections'
import { t } from '../i18n'

const SECTIONS: [string, string][] = [['how', t('How it works')], ['why', t('Why availability')], ['shifts', t('For employers')], ['trust', t('Trust & safety')]]
export default function PublicHome() {
  const { session, loading } = useAuth()
  if (!loading && session) return <Navigate to={homeFor(session)} replace />
  return (
    <div>
      <nav aria-label={t('Page sections')} className="flex flex-wrap gap-1 text-sm font-semibold text-muted">{SECTIONS.map(([id, l]) => <button key={id} onClick={() => scrollTo(id)} className="rounded-lg px-3 py-1.5 hover:text-brandfg">{l}</button>)}</nav>
      <Hero /><Stats /><HowItWorks /><WhyAvailability /><Featured /><ShiftDemo /><Audiences /><Trust /><FinalCta />
    </div>
  )
}
