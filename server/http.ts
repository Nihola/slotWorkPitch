import type { ErrorRequestHandler } from 'express'
import type { ZodType } from 'zod'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error', public extra: Record<string, unknown> = {}) { super(message) }
}
export const bad = (m: string) => new ApiError(400, m, 'invalid')
export const forbidden = (m = 'You do not have access to that.') => new ApiError(403, m, 'forbidden')
export const notFound = (m = 'Not found.') => new ApiError(404, m, 'not_found')
export const conflict = (m: string) => new ApiError(409, m, 'conflict')

/** Validates untrusted input. The first problem becomes the user-facing message. */
export function parse<T>(schema: ZodType<T, any, any>, data: unknown): T {
  const r = schema.safeParse(data)
  if (!r.success) throw bad(r.error.issues[0]?.message ?? 'Invalid request.')
  return r.data
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) { res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } }); return }
  if (err?.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'invalid', message: 'The request body is not valid JSON.' } }); return }
  if (err?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'too_large', message: 'That request is too large.' } }); return }
  console.error('Unhandled server error:', err)   // details stay in the server log, never in the response
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } })
}
