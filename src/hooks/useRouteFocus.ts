import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
/** After client-side navigation, move focus to the main region so keyboard and screen-reader users start at the new content. */
export function useRouteFocus(ref: RefObject<HTMLElement>) {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } ref.current?.focus({ preventScroll: true }); window.scrollTo?.({ top: 0 }) }, [pathname, ref])
}
