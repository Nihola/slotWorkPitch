import type { Config } from './config'
import type { DB } from './db'
import type { Mailer } from './mail/mailer'
import type { User } from '../src/types'
export interface Ctx { db: DB; cfg: Config; now: () => number; mailer: Mailer }
declare global { namespace Express { interface Request { user?: User } } }
