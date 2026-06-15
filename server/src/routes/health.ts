import type { FastifyInstance } from 'fastify'
import { desc, sql } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { ingestRuns, normas } from '../db/schema.js'

const STARTED = Date.now()

export function healthRoutes(app: FastifyInstance, db: Db) {
  app.get('/', async () => ({
    ok: true,
    service: 'upm-api',
    endpoints: ['/feed', '/laws', '/search', '/sources', '/health', '/auth/request-code', '/auth/verify', '/me', '/assistant'],
  }))

  app.get('/health', async (_req, reply) => {
    try {
      const [last] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.id)).limit(1)
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(normas)
      return {
        ok: true,
        db: 'up',
        lastIngest: last
          ? {
              finishedAt: last.finishedAt?.toISOString() ?? null,
              okSources: last.okSources,
              failedSources: last.failedSources,
              itemsUpserted: last.itemsUpserted,
            }
          : null,
        itemCount: count,
        uptime: Math.round((Date.now() - STARTED) / 1000),
      }
    } catch {
      return reply.code(503).send({ ok: false, db: 'down' })
    }
  })
}
