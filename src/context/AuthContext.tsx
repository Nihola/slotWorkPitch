import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { authService, type Session } from '../services/authService'
import type { Availability, CompanyProfile, JobSeeker, Role } from '../types'

interface Ctx {
  session: Session | null; loading: boolean
  login: (email: string, password: string) => Promise<Session>
  register: (i: { name: string; email: string; password: string; role: Role }) => Promise<Session>
  logout: () => Promise<void>
  completeOnboarding: (p: JobSeeker) => Promise<void>
  updateAvailability: (a: Availability[]) => void
  updateName: (name: string) => Promise<void>
  updateCompany: (c: CompanyProfile) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
}
const AuthCtx = createContext<Ctx | null>(null)
const SAVE_DELAY = 500

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<Session | null>(null)
  ref.current = session
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => { authService.restore().then(setSession).catch(() => setSession(null)).finally(() => setLoading(false)) }, [])
  // The server says our session is gone (expired, revoked after a password change elsewhere): fall back to the signed-out state.
  useEffect(() => { const out = () => setSession(null); window.addEventListener('slotwork:signed-out', out); return () => window.removeEventListener('slotwork:signed-out', out) }, [])

  const login = useCallback(async (e: string, p: string) => { const s = await authService.login(e, p); setSession(s); return s }, [])
  const register = useCallback(async (i: Parameters<typeof authService.register>[0]) => { const s = await authService.register(i); setSession(s); return s }, [])
  const logout = useCallback(async () => { clearTimeout(timer.current); try { await authService.logout() } finally { setSession(null) } }, [])
  const completeOnboarding = useCallback(async (p: JobSeeker) => { setSession(await authService.saveProfile(p)) }, [])
  /** Painting availability fires many edits; show them instantly and save once the user pauses. */
  const updateAvailability = useCallback((a: Availability[]) => {
    const cur = ref.current; if (!cur?.profile) return
    setSession({ ...cur, profile: { ...cur.profile, availability: a } })
    clearTimeout(timer.current); timer.current = setTimeout(() => { authService.updateAvailability(a).catch(() => { /* retried on the next edit */ }) }, SAVE_DELAY)
  }, [])
  const updateName = useCallback(async (n: string) => { setSession(await authService.updateName(n)) }, [])
  const updateCompany = useCallback(async (c: CompanyProfile) => { setSession(await authService.updateCompany(c)) }, [])
  const changePassword = useCallback((c: string, n: string) => authService.changePassword(c, n), [])

  const value = useMemo(() => ({ session, loading, login, register, logout, completeOnboarding, updateAvailability, updateName, updateCompany, changePassword }),
    [session, loading, login, register, logout, completeOnboarding, updateAvailability, updateName, updateCompany, changePassword])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
