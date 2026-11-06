import { useEffect, useState } from 'react'
import { notificationService } from '../services/notificationService'
const POLL_MS = 20_000
/** Live unread counts: refetched after our own changes, when the tab regains focus, and every 20 seconds. */
export function useBadges(userId?: string) {
  const [b, setB] = useState({ notifications: 0, messages: 0 })
  useEffect(() => {
    if (!userId) { setB({ notifications: 0, messages: 0 }); return }
    let alive = true
    const f = () => notificationService.counts().then(c => { if (alive) setB(p => (p.notifications === c.notifications && p.messages === c.messages ? p : c)) }).catch(() => { /* keep the last numbers */ })
    f(); const t = setInterval(() => { if (!document.hidden) f() }, POLL_MS)
    window.addEventListener('slotwork:data', f); window.addEventListener('focus', f)
    return () => { alive = false; clearInterval(t); window.removeEventListener('slotwork:data', f); window.removeEventListener('focus', f) }
  }, [userId])
  return b
}
