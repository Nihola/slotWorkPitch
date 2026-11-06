import path from 'node:path'
export interface MailConfig { mode: 'smtp' | 'console' | 'disabled'; from: string; appUrl: string; smtp?: { host: string; port: number; secure: boolean; user?: string; pass?: string } }
export interface Config { dbPath: string; port: number; production: boolean; seedDemo: boolean; adminEmail?: string; adminPassword?: string; staticDir: string | null; trustProxy: boolean; mail: MailConfig }
/**
 * Email: SMTP_URL (smtp://user:pass@host:587 or smtps://...) or SMTP_HOST/PORT/USER/PASS/SECURE, plus MAIL_FROM and APP_URL (the public address
 * used inside links; it is never taken from the request, so a forged Host header can't poison reset links).
 * Without SMTP: development prints emails to the server console; production disables email (and the UI says so).
 */
export function mailConfig(env: NodeJS.ProcessEnv, production: boolean): MailConfig {
  let smtp: MailConfig['smtp']
  if (env.SMTP_URL) {
    try { const u = new URL(env.SMTP_URL); smtp = { host: u.hostname, port: Number(u.port) || (u.protocol === 'smtps:' ? 465 : 587), secure: u.protocol === 'smtps:', user: u.username ? decodeURIComponent(u.username) : undefined, pass: u.password ? decodeURIComponent(u.password) : undefined } } catch { console.warn('SMTP_URL is not a valid URL and was ignored.') }
  } else if (env.SMTP_HOST) {
    const port = Number(env.SMTP_PORT ?? 587); smtp = { host: env.SMTP_HOST, port, secure: env.SMTP_SECURE === 'true' || port === 465, user: env.SMTP_USER, pass: env.SMTP_PASS }
  }
  const appUrl = (env.APP_URL ?? (production ? '' : 'http://localhost:5173')).replace(/\/+$/, '')
  const mode: MailConfig['mode'] = smtp && appUrl ? 'smtp' : production ? 'disabled' : 'console'
  if (production && smtp && !appUrl) console.warn('SMTP is configured but APP_URL is not set, so email links cannot be built. Email is disabled.')
  return { mode, from: env.MAIL_FROM ?? 'Slotwork <no-reply@localhost>', appUrl, smtp }
}

/** All settings come from environment variables (see .env.example). Nothing secret is hard-coded. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: string[] = process.argv): Config {
  const production = env.NODE_ENV === 'production' || argv.includes('--production')
  return {
    dbPath: env.DATABASE_PATH ?? path.resolve('data', 'slotwork.db'),
    port: Number(env.PORT ?? 3000),
    production,
    // Demo accounts share a public password, so they are OFF in production unless explicitly enabled.
    seedDemo: env.SEED_DEMO ? env.SEED_DEMO === 'true' : !production,
    adminEmail: env.ADMIN_EMAIL, adminPassword: env.ADMIN_PASSWORD,
    staticDir: env.SERVE_STATIC === 'false' ? null : path.resolve('dist'),
    trustProxy: env.TRUST_PROXY === 'true',
    mail: mailConfig(env, production),
  }
}
