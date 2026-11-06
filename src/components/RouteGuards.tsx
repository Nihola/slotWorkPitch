import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { guard, postAuthTarget } from '../utils/access'
import type { Role } from '../types'

const Splash = () => <div className="mx-auto max-w-5xl p-5"><div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></div>

export function RequireRole({ roles, allowIncomplete = false }: { roles: Role[]; allowIncomplete?: boolean }) {
  const { session, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Splash />
  const to = guard(session, roles, allowIncomplete)
  return to ? <Navigate to={to} replace state={to === '/login' ? { from: loc.pathname } : undefined} /> : <Outlet />
}

/** Login/register pages: signed-in users are sent on to where they belong. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Splash />
  if (session) return <Navigate to={postAuthTarget(session, (loc.state as { from?: string } | null)?.from)} replace />
  return <>{children}</>
}
