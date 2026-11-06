import { useSyncExternalStore } from 'react'
import { LANGS, getLang, setLang, subscribe, t, type Lang } from '../i18n'
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return (
    <select aria-label={t('Language')} value={lang} onChange={e => setLang(e.target.value as Lang)}
      className={`h-10 rounded-xl border border-slate-200 bg-transparent px-2 text-sm font-semibold dark:border-slate-700 ${className}`}>
      {LANGS.map(l => <option key={l.code} value={l.code} className="text-ink">{l.native}</option>)}
    </select>
  )
}
