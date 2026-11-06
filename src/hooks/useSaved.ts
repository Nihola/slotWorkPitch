import { useCallback, useEffect, useState } from 'react'
import { savedService } from '../services/savedService'
import { useToast } from '../context/ToastContext'
/** Saved job ids for the signed-in seeker. Toggling updates the screen at once and rolls back if the server refuses. */
export function useSaved() {
  const toast = useToast()
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => { let alive = true; savedService.get().then(l => { if (alive) setIds(l) }).catch(() => { /* shown as unsaved */ }); return () => { alive = false } }, [])
  const toggle = useCallback((jobId: string) => {
    const had = ids.includes(jobId)
    setIds(l => (had ? l.filter(x => x !== jobId) : [...l, jobId]))
    savedService.toggle(jobId).then(r => { setIds(r.ids); toast(r.saved ? 'Job saved' : 'Removed from saved jobs') })
      .catch(() => { setIds(l => (had ? [...l, jobId] : l.filter(x => x !== jobId))); toast("We couldn't update your saved jobs. Please try again.") })
  }, [ids, toast])
  return { ids, isSaved: (id: string) => ids.includes(id), toggle }
}
