import { randomUUID } from 'node:crypto'
import { all, get, run, type DB } from './db'
import type { NotificationCategory } from '../src/types'

export type PrefKey = 'applications' | 'messages' | 'jobs' | 'interviews'
export type Prefs = Record<PrefKey, boolean>
export const DEFAULT_PREFS: Prefs = { applications: true, messages: true, jobs: true, interviews: true }
export function getPrefs(db: DB, userId: string): Prefs {
  const row = get<{ data: string }>(db, 'SELECT data FROM prefs WHERE user_id = ?', userId)
  try { return { ...DEFAULT_PREFS, ...(row ? JSON.parse(row.data) : {}) } } catch { return { ...DEFAULT_PREFS } }
}
export function setPrefs(db: DB, userId: string, p: Prefs) {
  run(db, 'INSERT INTO prefs (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data', userId, JSON.stringify(p))
}

export interface NotifyInput { userId: string; category: NotificationCategory; kind: string; params?: Record<string, string | number>; body: string; link?: string; ref?: string }
/** Creates a notification unless the user switched the category off. With `ref`, repeated events update one unread item instead of piling up. */
export function notify(db: DB, n: NotifyInput, nowIso = new Date().toISOString()) {
  if (n.category !== 'system' && !getPrefs(db, n.userId)[n.category as PrefKey]) return
  const existing = n.ref ? get<{ id: string }>(db, 'SELECT id FROM notifications WHERE user_id = ? AND ref = ? AND read = 0', n.userId, n.ref) : undefined
  if (existing) { run(db, 'UPDATE notifications SET body = ?, kind = ?, params = ?, created_at = ? WHERE id = ?', n.body, n.kind, JSON.stringify(n.params ?? {}), nowIso, existing.id); return }
  run(db, 'INSERT INTO notifications (id, user_id, category, kind, params, body, link, ref, read, created_at) VALUES (?,?,?,?,?,?,?,?,0,?)',
    randomUUID(), n.userId, n.category, n.kind, JSON.stringify(n.params ?? {}), n.body, n.link ?? null, n.ref ?? null, nowIso)
}
export const unreadNotifications = (db: DB, userId: string) => get<{ c: number }>(db, 'SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0', userId)!.c
export const unreadMessages = (db: DB, userId: string) => {
  const r = get<{ c: number }>(db, 'SELECT COALESCE(SUM(CASE WHEN seeker_id = ?1 THEN unread_seeker ELSE unread_employer END), 0) c FROM conversations WHERE seeker_id = ?1 OR employer_id = ?1', userId)
  return r!.c
}
void all
