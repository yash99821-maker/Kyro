import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// server/src/config -> server
const serverRoot = path.resolve(here, '..', '..')

dotenv.config({ path: path.join(serverRoot, '.env') })

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUri: (process.env.MONGODB_URI ?? '').trim(),
  jwtSecret: process.env.JWT_SECRET ?? 'kyro-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  /** Data directory used by the embedded MongoDB fallback. */
  embeddedDbPath: path.join(serverRoot, '.mongo-data'),
  serverRoot,
} as const

export const isProduction = env.nodeEnv === 'production'
