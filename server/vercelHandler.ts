import type { Request, Response } from 'express'
import { loadConfig } from './config.js'
import { createApp } from './app.js'

const config = loadConfig({
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_PATH: '/tmp/slotwork.db',
  SERVE_STATIC: 'false',
})

// Reuse the initialized app for warm invocations of each Vercel function.
const appPromise = createApp(config).then(({ app }) => app)

export default async function handler(req: Request, res: Response) {
  try {
    const app = await appPromise
    return app(req, res)
  } catch (error) {
    console.error('Slotwork API initialization failed:', error)
    return res.status(500).json({ error: { code: 'server_error', message: 'The API could not start.' } })
  }
}
