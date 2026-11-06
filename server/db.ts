import { createRequire } from 'node:module'
import type { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

// Loaded through require so bundlers/test runners that don't know `node:sqlite` leave it alone.
const { DatabaseSync: Sqlite } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite')
export type DB = DatabaseSync
type Param = string | number | null
export const get = <T>(db: DB, sql: string, ...p: Param[]) => db.prepare(sql).get(...p) as unknown as T | undefined
export const all = <T>(db: DB, sql: string, ...p: Param[]) => db.prepare(sql).all(...p) as unknown as T[]
export const run = (db: DB, sql: string, ...p: Param[]) => db.prepare(sql).run(...p)
/** Runs fn inside a transaction; rolls back if it throws. */
export function tx<T>(db: DB, fn: () => T): T { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r } catch (e) { db.exec('ROLLBACK'); throw e } }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('seeker','employer','admin')),
  pw_hash TEXT NOT NULL, onboarded INTEGER NOT NULL DEFAULT 0, profile TEXT, company TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, employer_id TEXT NOT NULL, moderation TEXT NOT NULL, moderation_note TEXT, posted_at TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_employer ON jobs(employer_id);
CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, seeker_id TEXT NOT NULL, employer_id TEXT NOT NULL, status TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS apps_seeker ON applications(seeker_id); CREATE INDEX IF NOT EXISTS apps_employer ON applications(employer_id); CREATE INDEX IF NOT EXISTS apps_job ON applications(job_id, seeker_id);
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, application_id TEXT NOT NULL, job_id TEXT NOT NULL, job_title TEXT NOT NULL, company TEXT NOT NULL, shift_label TEXT,
  seeker_id TEXT NOT NULL, seeker_name TEXT NOT NULL, employer_id TEXT NOT NULL, last_message TEXT NOT NULL, last_at TEXT NOT NULL, unread_seeker INTEGER NOT NULL DEFAULT 0, unread_employer INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS conv_seeker ON conversations(seeker_id); CREATE INDEX IF NOT EXISTS conv_employer ON conversations(employer_id);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL, body TEXT NOT NULL, sent_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS msg_conv ON messages(conversation_id, sent_at);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category TEXT NOT NULL, kind TEXT NOT NULL, params TEXT NOT NULL DEFAULT '{}', body TEXT NOT NULL,
  link TEXT, ref TEXT, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id, created_at);
CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS resets_user ON password_resets(user_id, created_at);
CREATE TABLE IF NOT EXISTS prefs (user_id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS saved (user_id TEXT NOT NULL, job_id TEXT NOT NULL, PRIMARY KEY (user_id, job_id));
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, target_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT, reporter_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS moderation_log (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, job_id TEXT NOT NULL, job_title TEXT NOT NULL, action TEXT NOT NULL, reason TEXT,
  actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, at TEXT NOT NULL);
`
export function openDb(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new Sqlite(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)
  return db
}
