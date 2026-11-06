import { loadConfig } from './config.js'
import { createApp } from './app.js'

const cfg = loadConfig()
const { app, close } = await createApp(cfg)
if (cfg.production && cfg.mail.mode === 'disabled') console.warn('WARNING: email is not configured (set SMTP_URL, MAIL_FROM and APP_URL). Password reset emails cannot be sent.')
if (cfg.production && cfg.seedDemo) console.warn('WARNING: SEED_DEMO is on in production. Demo accounts share a public password.')
const server = app.listen(cfg.port, () => console.log(`Slotwork ${cfg.production ? '(production)' : '(development)'} listening on http://localhost:${cfg.port}  ·  database: ${cfg.dbPath}`))
const stop = () => server.close(() => { close(); process.exit(0) })
process.on('SIGINT', stop); process.on('SIGTERM', stop)
