import type { RefObject } from 'react'
import { t } from '../i18n'
/** First focusable element: lets keyboard users jump past the navigation. (No hash href, so it is safe with hash routing.) */
export default function SkipLink({ target }: { target: RefObject<HTMLElement> }) {
  return <a href="#main" onClick={e => { e.preventDefault(); target.current?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-white">{t('Skip to main content')}</a>
}
