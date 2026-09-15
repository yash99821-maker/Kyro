import { createApp } from './app.js'
import { connectDatabase, describeConnection, disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'

async function start() {
  console.log('\n  KYRO API — Smart Digital Payments & Money Management')
  console.log('  ---------------------------------------------------')

  let connection
  try {
    connection = await connectDatabase()
  } catch (error) {
    console.error('\n  Could not connect to MongoDB.')
    console.error('  ' + (error instanceof Error ? error.message : String(error)))
    console.error('\n  Check MONGODB_URI in server/.env, or leave it empty to use the')
    console.error('  built-in embedded MongoDB. See the README for setup steps.\n')
    process.exit(1)
  }

  console.log(`  Database : ${describeConnection(connection)}`)

  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`  API      : http://localhost:${env.port}/api`)
    console.log(`  Client   : ${env.clientUrl}`)
    console.log(`  Mode     : ${env.nodeEnv}`)
    console.log('\n  Payments are simulated. No real money is transferred.\n')
  })

  const shutdown = async (signal: string) => {
    console.log(`\n  ${signal} received — shutting down KYRO API...`)
    server.close()
    await disconnectDatabase()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  // Keep the API alive rather than crashing the demo on an unexpected rejection.
  process.on('unhandledRejection', (reason) => {
    console.error('  [kyro:unhandledRejection]', reason)
  })
}

void start()
