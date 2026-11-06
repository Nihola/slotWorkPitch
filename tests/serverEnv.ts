import { apiConfig } from '../src/api/client'
import { startServer, type TestServer } from '../server/tests/helpers'

/** UI tests run against a real in-process server (in-memory database), with a cookie jar standing in for the browser. */
export const jar = new Map<string, string>()
export let server: TestServer

const cookieFetch: typeof fetch = async (input, init = {}) => {
  const headers = new Headers(init.headers)
  if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '))
  const res = await fetch(input, { ...init, headers })
  for (const c of res.headers.getSetCookie()) {
    const [kv, ...flags] = c.split(';'), i = kv.indexOf('='), v = kv.slice(i + 1)
    if (v === '' || flags.some(f => f.trim() === 'Max-Age=0')) jar.delete(kv.slice(0, i)); else jar.set(kv.slice(0, i), v)
  }
  return res
}
export async function bootServer() { jar.clear(); server = await startServer(); apiConfig.base = server.url; apiConfig.fetchImpl = cookieFetch }
export async function stopServer() { jar.clear(); await server.close() }
/** Forget the browser's cookies, i.e. "close the browser". */
export const clearCookies = () => jar.clear()
