import nodemailer from 'nodemailer'
import type { MailConfig } from '../config'

export interface Mail { to: string; subject: string; text: string; html: string }
export interface Mailer { readonly enabled: boolean; send(m: Mail): Promise<void> }

/** Real delivery through your SMTP server. */
export class SmtpMailer implements Mailer {
  readonly enabled = true
  private transport
  constructor(private cfg: MailConfig) {
    const s = cfg.smtp!
    this.transport = nodemailer.createTransport({ host: s.host, port: s.port, secure: s.secure, auth: s.user ? { user: s.user, pass: s.pass ?? '' } : undefined, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 })
  }
  async send(m: Mail) { await this.transport.sendMail({ from: this.cfg.from, to: m.to, subject: m.subject, text: m.text, html: m.html }) }
}
/** Development convenience: prints the email (including the reset link) to the server console. Never used in production. */
export class ConsoleMailer implements Mailer {
  readonly enabled = true
  async send(m: Mail) { console.log(`\n── email (development: printed instead of sent) ──\nTo: ${m.to}\nSubject: ${m.subject}\n\n${m.text}\n──────────────────────────────────────────────\n`) }
}
/** Production without SMTP settings: nothing can be sent, and the API tells the UI so. */
export class DisabledMailer implements Mailer {
  readonly enabled = false
  async send(): Promise<void> { throw new Error('Email is not configured on this server (set SMTP_URL and APP_URL).') }
}
/** For tests: keeps every message in memory. */
export class MemoryMailer implements Mailer {
  readonly enabled = true
  outbox: Mail[] = []
  fail = false
  async send(m: Mail) { if (this.fail) throw new Error('simulated mail failure'); this.outbox.push(m) }   // pushed synchronously, before the first await
}
export function createMailer(cfg: MailConfig): Mailer { return cfg.mode === 'smtp' ? new SmtpMailer(cfg) : cfg.mode === 'console' ? new ConsoleMailer() : new DisabledMailer() }
