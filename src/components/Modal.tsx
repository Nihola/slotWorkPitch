import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { t } from '../i18n'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
/** Accessible dialog: focus moves in, Tab is trapped, Escape closes, and focus returns to what opened it. */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const el = panel.current; el?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close.current(); return }
      if (e.key !== 'Tab' || !el) return
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)); if (!items.length) return
      const first = items[0], last = items[items.length - 1], active = document.activeElement
      if (e.shiftKey && (active === first || active === el)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [])
  return (
    <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center">
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/60" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 outline-none dark:bg-[#131839] sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label={t('Close')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"><X size={16} /></button></div>
        {children}
      </div>
    </div>
  )
}
