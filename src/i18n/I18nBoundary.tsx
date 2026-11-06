import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { getLang, subscribe } from '.'
/** Re-renders everything below it when the language changes (the key remounts the subtree so every string is looked up again). */
export default function I18nBoundary({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return <Fragment key={lang}>{children}</Fragment>
}
