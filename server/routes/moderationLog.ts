import { randomUUID } from 'node:crypto'
import { run, type DB } from '../db.js'
import type { ModerationEntry } from '../../src/types'
export function addLog(db: DB, e: Omit<ModerationEntry, 'id' | 'at'>, at: string) {
  run(db, 'INSERT INTO moderation_log (id, job_id, job_title, action, reason, actor_id, actor_name, at) VALUES (?,?,?,?,?,?,?,?)', randomUUID(), e.jobId, e.jobTitle, e.action, e.reason ?? null, e.actorId, e.actorName, at)
}
