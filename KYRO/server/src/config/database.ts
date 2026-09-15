import mongoose from 'mongoose'
import fs from 'node:fs'
import { env } from './env.js'

/**
 * Connects Mongoose to MongoDB.
 *
 * Two supported modes:
 *
 * 1. `MONGODB_URI` is set  -> connect to that server (local mongod or Atlas).
 *    This is the normal path and what the README documents first.
 *
 * 2. `MONGODB_URI` is empty -> start an embedded MongoDB server via
 *    `mongodb-memory-server`, pointed at an on-disk data directory
 *    (`server/.mongo-data`). This is a genuine `mongod` process with real
 *    data files, so documents survive server restarts. It exists so the
 *    project runs on a machine with no MongoDB installation.
 *
 * Either way the application only ever talks to MongoDB through Mongoose
 * models — nothing is stored in memory or in the browser.
 */

let embeddedServer: { stop: () => Promise<boolean> } | null = null

/**
 * The embedded server always listens on this fixed port.
 *
 * A fixed port lets a second process — `npm run seed` while `npm run dev` is
 * already running — reuse the mongod that is already up instead of trying to
 * start a second one and failing on the data directory lock.
 *
 * 27018 rather than the default 27017, so it never collides with a real
 * MongoDB installation on the same machine.
 */
const EMBEDDED_PORT = 27018
const EMBEDDED_URI = `mongodb://127.0.0.1:${EMBEDDED_PORT}/kyro`

export interface DbConnectionInfo {
  uri: string
  mode: 'external' | 'embedded' | 'embedded-reused'
}

/** True when something is already serving MongoDB on the embedded port. */
async function embeddedServerIsRunning(): Promise<boolean> {
  try {
    await mongoose.connect(EMBEDDED_URI, {
      serverSelectionTimeoutMS: 1200,
      connectTimeoutMS: 1200,
    })
    return true
  } catch {
    // Leave no half-open connection behind before we start our own instance.
    await mongoose.connection.close().catch(() => undefined)
    return false
  }
}

async function startEmbeddedMongo(): Promise<string> {
  fs.mkdirSync(env.embeddedDbPath, { recursive: true })

  // Imported lazily so a deployment that sets MONGODB_URI does not need the
  // (large) embedded MongoDB dev dependency at runtime.
  const { MongoMemoryServer } = await import('mongodb-memory-server')

  const server = await MongoMemoryServer.create({
    instance: {
      port: EMBEDDED_PORT,
      dbName: 'kyro',
      dbPath: env.embeddedDbPath,
      storageEngine: 'wiredTiger', // persists to dbPath across restarts
    },
  })

  embeddedServer = server
  return EMBEDDED_URI
}

export async function connectDatabase(): Promise<DbConnectionInfo> {
  mongoose.set('strictQuery', true)

  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
    return { uri: env.mongoUri, mode: 'external' }
  }

  if (await embeddedServerIsRunning()) {
    return { uri: EMBEDDED_URI, mode: 'embedded-reused' }
  }

  const uri = await startEmbeddedMongo()
  await mongoose.connect(uri)
  return { uri, mode: 'embedded' }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close()
  if (embeddedServer) {
    await embeddedServer.stop()
    embeddedServer = null
  }
}

/** Human-readable label for logs, with any credentials stripped out. */
export function describeConnection(info: DbConnectionInfo): string {
  if (info.mode === 'embedded') {
    return `embedded MongoDB on port ${EMBEDDED_PORT} (data dir: ${env.embeddedDbPath})`
  }
  if (info.mode === 'embedded-reused') {
    return `embedded MongoDB already running on port ${EMBEDDED_PORT}`
  }
  return info.uri.replace(/\/\/[^@]*@/, '//<credentials>@')
}
