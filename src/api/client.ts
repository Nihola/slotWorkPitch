/** The single place the UI talks to the server. Everything else goes through the services in src/services. */
import { t } from '../i18n'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
interface ApiConfig { base: string; fetchImpl: typeof fetch }
/** Same-origin by default (the server also serves the site). Tests point `base` at an in-process server. */
export const apiConfig: ApiConfig = { base: (import.meta.env?.VITE_API_URL as string | undefined) ?? '', fetchImpl: (...a) => fetch(...a) }

const fire = (name: string) => { try { window.dispatchEvent(new Event(name)) } catch { /* not in a browser */ } }
/** Tells hooks and pages that server data may have changed, so they refetch. */
export const emitChange = () => fire('slotwork:data')

export async function api<T = void>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await apiConfig.fetchImpl(`${apiConfig.base}/api${path}`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'slotwork' }, body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch { throw new ApiError(0, 'network', t("We couldn't reach the server. Check your connection and try again.")) }
  const data = res.status === 204 ? undefined : await res.json().catch(() => null)
  if (!res.ok) {
    const code = data?.error?.code ?? 'error'
    if (res.status === 401 && code === 'unauthenticated') fire('slotwork:signed-out')   // session expired or revoked: send the user back to sign in
    throw new ApiError(res.status, code, t(data?.error?.message ?? 'Something went wrong. Please try again.'))
  }
  // Signing in or out changes who "we" are, not the data; hooks resubscribe on their own, so don't make them refetch with a just-closed session.
  if (method !== 'GET' && !path.startsWith('/auth/')) emitChange()
  return data as T
}
/** Turns a server rejection (4xx) into the domain error class a page already knows how to show; anything else (network, 5xx) passes through. */
export const asDomain = <E extends Error>(Ctor: new (message: string) => E) => (e: unknown): never => { throw e instanceof ApiError && e.status >= 400 && e.status < 500 ? new Ctor(e.message) : e }
/** 404 becomes `undefined` instead of an exception. */
export const orUndefined = (e: unknown): undefined => { if (e instanceof ApiError && e.status === 404) return undefined; throw e }
