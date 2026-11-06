import type { Request, Response } from 'express'
import { loadConfig } from '../server/config'
import { createApp } from '../server/app'

// Keep one server instance for the lifetime of a Vercel function instance.
// /tmp is writable on Vercel, but its contents are ephemeral and instance-local.
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_PATH: '/tmp/slotwork.db',
  SERVE_STATIC: 'false',
})

const appPromise = createApp(config).then(({ app }) => app)

export default async function handler(req: Request, res: Response) {
  const app = await appPromise
  return app(req, res)
}
