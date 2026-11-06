import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems(l => [...l, { id, msg }])
    setTimeout(() => setItems(l => l.filter(i => i.id !== id)), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {items.map(i => <div key={i.id} className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-ink">{i.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}
