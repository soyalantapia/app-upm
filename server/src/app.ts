import Fastify from 'fastify'
import compress from '@fastify/compress'
import cors from '@fastify/cors'
import type { Config } from './config.js'
import type { Db } from './db/client.js'
import { healthRoutes } from './routes/health.js'
import { feedRoutes } from './routes/feed.js'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { assistantRoutes } from './routes/assistant.js'
import { getLlm } from './llm.js'

// build del server exportable (tests usan app.inject() sin levantar puerto)
export async function buildApp(config: Config, db: Db) {
  const app = Fastify({ logger: config.isProd ? true : { level: 'warn' } })

  // gzip/brotli: /feed pesa ~1.3MB en JSON plano → ~10x menos comprimido
  await app.register(compress, { global: true })

  await app.register(cors, {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  healthRoutes(app, db)
  feedRoutes(app, db)
  authRoutes(app, db, config)
  meRoutes(app, db, config.JWT_SECRET)
  assistantRoutes(app, db, getLlm(config))

  return app
}
