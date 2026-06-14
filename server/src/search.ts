import { and, inArray, sql } from 'drizzle-orm'
import type { Db } from './db/client.js'
import { normas } from './db/schema.js'
import type { NewsItem } from './types.js'
import { rowToItem, noiseFilter } from './routes/feed.js'

// Versión raw del filtro de ruido para inyectar en los CTE crudos (mismo predicado).
const NOISE_SQL = "id not like 'br-votacao%' and id not like 'br-evento%'"

// Búsqueda HÍBRIDA: combina similitud semántica (pgvector / embeddings e5) con
// full-text search (FTS español), fusionadas con Reciprocal Rank Fusion (RRF).
// Si el embedding de la query no está disponible (modelo no carga / SEMANTIC=off)
// → cae a FTS puro. Cero regresión respecto del /search anterior.

const SEMANTIC_ENABLED = (process.env.SEMANTIC_SEARCH ?? 'on').toLowerCase() !== 'off'
const RRF_K = 60

// Embedding de la query, perezoso y a prueba de fallos. Devuelve null si no se
// puede (el server cae a FTS). El import es dinámico para no cargar
// transformers.js en el boot ni si SEMANTIC está apagado.
async function tryEmbedQuery(text: string): Promise<number[] | null> {
  if (!SEMANTIC_ENABLED) return null
  try {
    const { embedQuery } = await import('./embed/embedder.js')
    return await embedQuery(text)
  } catch {
    return null
  }
}

const FTS = sql`to_tsvector('spanish', ${normas.title} || ' ' || ${normas.excerpt} || ' ' || coalesce(${normas.fullText}, ''))`

async function fetchOrdered(db: Db, ids: string[]): Promise<NewsItem[]> {
  if (ids.length === 0) return []
  const rows = await db.select().from(normas).where(inArray(normas.id, ids))
  const byId = new Map(rows.map(r => [r.id, r]))
  return ids.map(id => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r)).map(rowToItem)
}

export type SearchMode = 'hybrid' | 'fts'

export async function hybridSearch(
  db: Db,
  query: string,
  limit = 50,
): Promise<{ items: NewsItem[]; mode: SearchMode }> {
  const vec = await tryEmbedQuery(query)
  const tsq = sql`plainto_tsquery('spanish', ${query})`

  if (!vec) {
    // Fallback FTS puro (comportamiento anterior)
    const rows = await db
      .select({ id: normas.id })
      .from(normas)
      .where(and(sql`${FTS} @@ ${tsq}`, noiseFilter))
      .orderBy(sql`ts_rank(${FTS}, ${tsq}) DESC`)
      .limit(limit)
    return { items: await fetchOrdered(db, rows.map(r => r.id)), mode: 'fts' }
  }

  // Híbrido: RRF entre top-40 semántico y top-40 FTS, en una sola query.
  const vecLit = sql.raw(`'[${vec.join(',')}]'::vector`)
  const fused = await db.execute(sql`
    with vec as (
      select id, row_number() over (order by embedding <=> ${vecLit}) as rnk
      from normas where embedding is not null and ${sql.raw(NOISE_SQL)}
      order by embedding <=> ${vecLit} limit 40
    ),
    fts as (
      select id, row_number() over (order by ts_rank(${FTS}, ${tsq}) desc) as rnk
      from normas where ${FTS} @@ ${tsq} and ${sql.raw(NOISE_SQL)} limit 40
    ),
    fused as (
      select id, sum(score) as score from (
        select id, 1.0/(${RRF_K} + rnk) as score from vec
        union all
        select id, 1.0/(${RRF_K} + rnk) as score from fts
      ) s group by id
    )
    select id from fused order by score desc limit ${limit}
  `)
  const ids = (fused.rows as { id: string }[]).map(r => r.id)
  return { items: await fetchOrdered(db, ids), mode: 'hybrid' }
}
