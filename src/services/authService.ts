import { api, asDomain } from '../api/client'
import { getLang } from '../i18n'
import type { Availability, CompanyProfile, JobSeeker, Role, User } from '../types'

export interface Session { user: User; profile: JobSeeker | null; onboarded: boolean; company: CompanyProfile | null }
export class AuthError extends Error {}
/** Shown on the login page of the demo build (the demo accounts only exist when the server runs with SEED_DEMO=true). */
export const DEMO_PASSWORD = 'demo1234'
const rej = asDomain(AuthError)
const slots = (a: Availability[]) => a.map(({ dayOfWeek, startHour, endHour, kind }) => ({ dayOfWeek, startHour, endHour, kind }))

export const authService = {
  restore: async (): Promise<Session | null> => (await api<{ session: Session | null }>('GET', '/auth/me')).session,
  login: async (email: string, password: string): Promise<Session> => (await api<{ session: Session }>('POST', '/auth/login', { email, password }).catch(rej)).session,
  register: async (input: { name: string; email: string; password: string; role: Role }): Promise<Session> => (await api<{ session: Session }>('POST', '/auth/register', input).catch(rej)).session,
  logout: async () => { await api('POST', '/auth/logout') },
  /** The server emails a one-time link (valid for 1 hour). The language is used for the email text. */
  requestPasswordReset: async (email: string) => { await api('POST', '/auth/forgot-password', { email, lang: getLang() }).catch(rej) },
  getConfig: (): Promise<{ emailEnabled: boolean }> => api('GET', '/auth/config'),
  checkResetToken: async (token: string): Promise<boolean> => (await api<{ valid: boolean }>('GET', `/auth/reset-password/check?token=${encodeURIComponent(token)}`)).valid,
  resetPassword: async (token: string, password: string) => { await api('POST', '/auth/reset-password', { token, password, lang: getLang() }).catch(rej) },
  saveProfile: async (p: JobSeeker): Promise<Session> => (await api<{ session: Session }>('PUT', '/me/profile', {
    headline: p.headline, city: p.city, district: p.district, skills: p.skills, education: p.education ?? '', experience: p.experience ?? '', jobTypes: p.jobTypes ?? [],
    remoteOk: !!p.remoteOk, flexible: !!p.flexible, availableFrom: p.availableFrom, availableUntil: p.availableUntil, availability: slots(p.availability),
  }).catch(rej)).session,
  updateAvailability: async (a: Availability[]) => { await api('PUT', '/me/availability', { availability: slots(a) }) },
  updateName: async (name: string): Promise<Session> => (await api<{ session: Session }>('PATCH', '/me/name', { name }).catch(rej)).session,
  changePassword: async (current: string, next: string) => { await api('POST', '/me/password', { current, next }).catch(rej) },
  updateCompany: async (c: CompanyProfile): Promise<Session> => (await api<{ session: Session }>('PUT', '/me/company', c).catch(rej)).session,
  listUsers: (): Promise<(User & { onboarded: boolean })[]> => api('GET', '/admin/users'),
}
