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

// Filtro de RUIDO procesal: excluye registros de Brasil sin contenido legislativo
// (votaciones repetidas "Votación aprobada…" y eventos de agenda br-evento).
// Reversible (no borra datos); se aplica a /feed, /laws, /search y al RAG.
// NO toca leyes reales (incl. las AR con título genérico "· DISPOSICIONES").
export const noiseFilter = sql`${normas.id} not like 'br-votacao%' and ${normas.id} not like 'br-evento%'`

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

// Tope por país en el feed BALANCEADO. Un date-sort global capeado a 500 dejaba
// que un país de alto volumen (Brasil · Câmara, ~150 proposiciones/día) tapara a
// los de corpus histórico (AR/CO/UY) y los empujara fuera del payload → un
// legislador argentino veía casi puro Brasil. Con esto, CADA país aporta sus N
// más recientes y el cliente rankea según las preferencias del legislador.
const FEED_LIMIT = 500
const PER_COUNTRY = 130

async function balancedRows(db: Db, extra: ReturnType<typeof and>) {
  const countryRows = await db
    .select({ c: normas.country })
    .from(normas)
    .where(noiseFilter)
    .groupBy(normas.country)
  const perCountry = await Promise.all(
    countryRows.map(({ c }) =>
      db
        .select()
        .from(normas)
        .where(and(noiseFilter, eq(normas.country, c), extra))
        .orderBy(desc(normas.date))
        .limit(PER_COUNTRY),
    ),
  )
  return perCountry
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, FEED_LIMIT)
}

export function feedRoutes(app: FastifyInstance, db: Db) {
  app.get('/feed', async (req, reply) => {
    const parsed = FeedQuery.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues })
    }
    const { pais, tema } = parsed.data
    const temaWhere = tema ? eq(normas.topic, tema) : undefined
    // Con país explícito → ese país (filtro server-side). Sin país → balanceado.
    const rows = pais
      ? await db
          .select()
          .from(normas)
          .where(and(noiseFilter, eq(normas.country, pais), temaWhere))
          .orderBy(desc(normas.date))
          .limit(FEED_LIMIT)
      : await balancedRows(db, temaWhere)
    return feedEnvelope(db, rows.map(rowToItem))
  })

  app.get('/laws', async (req, reply) => {
    const parsed = FeedQuery.safeParse(req.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues })
    }
    const { pais, tema } = parsed.data
    const typeWhere = inArray(normas.type, ['ley', 'decreto', 'reglamento', 'informe'])
    const temaWhere = tema ? eq(normas.topic, tema) : undefined
    const rows = pais
      ? await db
          .select()
          .from(normas)
          .where(and(noiseFilter, typeWhere, eq(normas.country, pais), temaWhere))
          .orderBy(desc(normas.date))
          .limit(FEED_LIMIT)
      : await balancedRows(db, and(typeWhere, temaWhere))
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
