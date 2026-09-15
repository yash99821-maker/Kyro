import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import path from 'node:path'
import fs from 'node:fs'
import { env, isProduction } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

// server/src/app.ts -> ../../../client/dist (the Vite production build)
const clientDistPath = path.resolve(env.serverRoot, '..', 'client', 'dist')
const clientBuildExists = fs.existsSync(path.join(clientDistPath, 'index.html'))

/**
 * Builds the Express application. Kept separate from `index.ts` so the app
 * can be imported (for tests or scripts) without starting a server.
 */
export function createApp() {
  const app = express()

  // Allow the Vite dev server and, in production, the deployed client origin.
  const allowedOrigins = new Set([env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'])

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin / curl / server-to-server requests have no Origin header.
        if (!origin || allowedOrigins.has(origin)) return callback(null, true)
        callback(new Error('This origin is not allowed by the KYRO API CORS policy.'))
      },
      credentials: true,
    }),
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  if (!isProduction) app.use(morgan('dev'))

  if (!clientBuildExists) {
    app.get('/', (_req, res) => {
      res.json({
        service: 'KYRO API',
        tagline: 'Smart Digital Payments & Money Management',
        docs: '/api/health',
        notice:
          'College demonstration project. Payments are simulated and no real money is transferred.',
      })
    })
  }

  app.use('/api', routes)
  app.use('/api', notFoundHandler)

  // Serve the built React app (client/dist) so the API and frontend are one
  // deployable service reachable from a single link — no separate frontend
  // host or CORS setup needed for it. Only kicks in when `npm run build`
  // has produced client/dist; in dev, Vite's own server handles the UI.
  if (clientBuildExists) {
    app.use(express.static(clientDistPath))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'))
    })
  }

  app.use(errorHandler)

  return app
}