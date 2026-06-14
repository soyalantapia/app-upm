import type { FastifyInstance } from 'fastify'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { ingestRuns, normas, sources } from '../db/schema.js'
import type { NewsItem, SourceReport } from '../types.js'
import { COUNTRY_CODES, TOPICS } from '../types.js'

const FeedQuery = z.object({
  pais: z.enum(COUNTRY_CODES).optional(),
  tema: z.enum(TOPICS).optional(),
})

type NormaRow = typeof normas.$inferSelect

// DB row → NewsItem del contrato: los opcionales null se OMITEN (no null).
export function rowToItem(r: NormaRow): NewsItem {
  const item: NewsItem = {
    id: r.id,
    title: r.title,
    country: r.country,
    topic: r.topic,
    type: r.type,
    date: r.date,
    relevance: r.relevance,
    excerpt: r.excerpt,
    source: r.source,
  }
  if (r.fullText != null) item.fullText = r.fullText
  if (r.authors != null) item.authors = r.authors
  if (r.status != null) item.status = r.status
  if (r.tipoDocumento != null) item.tipoDocumento = r.tipoDocumento
  if (r.tipoConteudo != null) item.tipoConteudo = r.tipoConteudo
  if (r.keywords != null) item.keywords = r.keywords
  if (r.sourceUrl != null) item.sourceUrl = r.sourceUrl
  if (r.pdfUrl != null) item.pdfUrl = r.pdfUrl
  if (r.dataPublicacao != null) item.dataPublicacao = r.dataPublicacao
  if (r.dataAtualizacao != null) item.dataAtualizacao = r.dataAtualizacao
  if (r.apiDetailUrl != null) item.apiDetailUrl = r.apiDetailUrl
  if (r.comision != null) item.comision = r.comision
  if (r.tramitaciones != null) item.tramitaciones = r.tramitaciones
  return item
}

async function feedEnvelope(db: Db, items: NewsItem[]) {
  const [lastOkRun] = await db
    .select()
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.id))
    .limit(1)
  const srcRows = await db.select().from(sources)
  const reports: SourceReport[] = srcRows.map(s => ({
    id: s.id,
    label: s.label,
    country: s.country,
    ok: s.lastOk ?? false,
    count: s.lastCount,
    ...(s.lastError ? { error: s.lastError } : {}),
  }))
  return {
    items,
    fetchedAt: lastOkRun?.finishedAt?.toISOString() ?? new Date().toISOString(),
    sources: reports,
  }
}

export function feedRoutes(app: FastifyInstance, db: Db) {
  app.get('/feed', async (req, reply) => {
    const parsed = FeedQuery.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues })
    }
    const { pais, tema } = parsed.data
    const where = and(
      pais ? eq(normas.country, pais) : undefined,
      tema ? eq(normas.topic, tema) : undefined,
    )
    const rows = await db.select().from(normas).where(where).orderBy(desc(normas.date)).limit(500)
    return feedEnvelope(db, rows.map(rowToItem))
  })

  app.get('/laws', async (req, reply) => {
    const parsed = FeedQuery.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues })
    }
    const { pais, tema } = parsed.data
    const where = and(
      inArray(normas.type, ['ley', 'decreto', 'reglamento', 'informe']),
      pais ? eq(normas.country, pais) : undefined,
      tema ? eq(normas.topic, tema) : undefined,
    )
    const rows = await db.select().from(normas).where(where).orderBy(desc(normas.date)).limit(500)
    return feedEnvelope(db, rows.map(rowToItem))
  })

  app.get('/search', async (req, reply) => {
    const q = ((req.query as Record<string, unknown>).q ?? '').toString().trim()
    if (q.length < 2) {
      return reply.code(400).send({ error: 'invalid query', details: 'q requiere al menos 2 caracteres' })
    }
    // Búsqueda híbrida (semántica pgvector + FTS, fusión RRF). Cae a FTS si no
    // hay embedding de query. El envelope incluye `mode` para observabilidad.
    const { hybridSearch } = await import('../search.js')
    const { items, mode } = await hybridSearch(db, q, 50)
    return { ...(await feedEnvelope(db, items)), mode }
  })

  app.get('/sources', async () => {
    const rows = await db.select().from(sources)
    return rows.map(s => ({ id: s.id, label: s.label, country: s.country }))
  })
}
