import { Pool } from '@neondatabase/serverless'
import type { UserRow } from './mappers'

let pool: Pool | undefined
let initialized: Promise<void> | undefined

function database() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!url) return null
  pool ??= new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 10_000 })
  initialized ??= (async () => {
    await pool!.query(`CREATE TABLE IF NOT EXISTS slotwork_users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('seeker','employer','admin')),
      pw_hash TEXT NOT NULL, onboarded INTEGER NOT NULL DEFAULT 0,
      profile TEXT, company TEXT, created_at TEXT NOT NULL
    )`)
    await pool!.query(`CREATE TABLE IF NOT EXISTS slotwork_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES slotwork_users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
    )`)
    await pool!.query('CREATE INDEX IF NOT EXISTS slotwork_sessions_expiry ON slotwork_sessions(expires_at)')
    await pool!.query(`CREATE TABLE IF NOT EXISTS slotwork_login_attempts (
      email TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_at BIGINT NOT NULL, locked_until BIGINT NOT NULL DEFAULT 0
    )`)
  })()
  return { pool, ready: initialized }
}

export const persistentAuthEnabled = () => !!(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)

export async function persistentFindUser(email: string) {
  const db = database(); if (!db) return undefined
  await db.ready
  const result = await db.pool.query<UserRow>('SELECT * FROM slotwork_users WHERE email = $1', [email])
  return result.rows[0]
}

export async function persistentCreateUser(user: UserRow) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query('INSERT INTO slotwork_users (id,email,name,role,pw_hash,onboarded,profile,company,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [user.id, user.email, user.name, user.role, user.pw_hash, user.onboarded, user.profile, user.company, user.created_at])
}

export async function persistentSaveUser(user: UserRow) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query(`INSERT INTO slotwork_users (id,email,name,role,pw_hash,onboarded,profile,company,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role,
    pw_hash=EXCLUDED.pw_hash,onboarded=EXCLUDED.onboarded,profile=EXCLUDED.profile,company=EXCLUDED.company`,
    [user.id, user.email, user.name, user.role, user.pw_hash, user.onboarded, user.profile, user.company, user.created_at])
}

export async function persistentUserBySession(sessionId: string, now: number) {
  const db = database(); if (!db) return undefined
  await db.ready
  const result = await db.pool.query<UserRow & { expires_at: string | number }>(
    'SELECT u.*, s.expires_at FROM slotwork_sessions s JOIN slotwork_users u ON u.id=s.user_id WHERE s.id=$1', [sessionId])
  const row = result.rows[0]
  if (!row) return undefined
  if (Number(row.expires_at) <= now) { await persistentDeleteSession(sessionId); return undefined }
  return row
}

export async function persistentCreateSession(id: string, userId: string, expiresAt: number, createdAt: number) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query('DELETE FROM slotwork_sessions WHERE expires_at < $1', [createdAt])
  await db.pool.query('INSERT INTO slotwork_sessions (id,user_id,expires_at,created_at) VALUES ($1,$2,$3,$4)', [id,userId,expiresAt,createdAt])
}

export async function persistentDeleteSession(id: string) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query('DELETE FROM slotwork_sessions WHERE id=$1', [id])
}

export async function persistentDeleteUserSessions(userId: string, exceptId = '') {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query('DELETE FROM slotwork_sessions WHERE user_id=$1 AND id<>$2', [userId, exceptId])
}

export async function persistentLoginAttempts(email: string) {
  const db = database(); if (!db) return undefined
  await db.ready
  const result = await db.pool.query<{ fails: number; first_at: string | number; locked_until: string | number }>(
    'SELECT fails,first_at,locked_until FROM slotwork_login_attempts WHERE email=$1', [email])
  const row = result.rows[0]
  return row && { fails: row.fails, first_at: Number(row.first_at), locked_until: Number(row.locked_until) }
}

export async function persistentSetLoginAttempts(email: string, fails: number, firstAt: number, lockedUntil: number) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query(`INSERT INTO slotwork_login_attempts (email,fails,first_at,locked_until) VALUES ($1,$2,$3,$4)
    ON CONFLICT(email) DO UPDATE SET fails=EXCLUDED.fails,first_at=EXCLUDED.first_at,locked_until=EXCLUDED.locked_until`, [email,fails,firstAt,lockedUntil])
}

export async function persistentClearLoginAttempts(email: string) {
  const db = database(); if (!db) return
  await db.ready
  await db.pool.query('DELETE FROM slotwork_login_attempts WHERE email=$1', [email])
}
