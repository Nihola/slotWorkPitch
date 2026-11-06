import type { Role } from '../types'
import type { Session } from '../services/authService'

/** Where a signed-in user lands by default. */
export const homeFor = (s: Session | null): string =>
  !s ? '/' : s.user.role === 'admin' ? '/admin' : s.user.role === 'employer' ? '/employer' : s.onboarded ? '/dashboard' : '/onboarding'

/** Returns the path to redirect to, or null when access is allowed. */
export function guard(session: Session | null, allowed: Role[], allowIncomplete = false): string | null {
  if (!session) return '/login'
  if (!allowed.includes(session.user.role)) return homeFor(session)
  if (session.user.role === 'seeker' && !session.onboarded && !allowIncomplete) return '/onboarding'
  return null
}

const PREFIXES: Record<Role, string[]> = {
  seeker: ['/dashboard', '/jobs', '/saved', '/applications', '/messages', '/notifications', '/profile', '/settings', '/onboarding'],
  employer: ['/employer', '/settings'],
  admin: ['/admin'],
}
export const canAccess = (role: Role, path: string) => PREFIXES[role].some(p => path === p || path.startsWith(p + '/'))

/** After login/register: return to the page they wanted if their role may see it. */
export function postAuthTarget(session: Session, from?: string): string {
  if (session.user.role === 'seeker' && !session.onboarded) return '/onboarding'
  return from && canAccess(session.user.role, from) ? from : homeFor(session)
}
