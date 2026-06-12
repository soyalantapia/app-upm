import { sql } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { ingestRuns, normas, sources } from '../db/schema.js'
import type { NewsItem, SourceReport } from '../types.js'
import { COUNTRY_CODES, DOC_TYPES, RELEVANCES, TOPICS } from '../types.js'
import { FETCHERS } from './registry.js'

// Validación dura de enums antes de tocar la DB: un valor fuera del enum
// rompería el insert (pgEnum) y, peor, los filtros del front.
function isValid(item: NewsItem): boolean {
  return Boolean(
    item.id &&
    item.title?.trim() &&
    item.excerpt !== undefined &&
    (COUNTRY_CODES as readonly string[]).includes(item.country) &&
    (TOPICS as readonly string[]).includes(item.topic) &&
    (DOC_TYPES as readonly string[]).includes(item.type) &&
    (RELEVANCES as readonly string[]).includes(item.relevance) &&
    item.date,
  )
}

export type IngestResult = {
  okSources: number
  failedSources: number
  itemsUpserted: number
  reports: SourceReport[]
}

let running = false // lock simple en memoria — no solapar runs

export async function runIngest(db: Db, staticBase: string): Promise<IngestResult> {
  if (running) throw new Error('ingest ya en curso')
  running = true
  const startedAt = new Date()
  try {
    // Aislamiento de fallos por fuente (patrón .then(ok, err) del worker):
    // una fuente caída NUNCA aborta el run.
    const settled = await Promise.all(
      FETCHERS.map(f =>
        f.fn({ staticBase }).then(
          items => ({ f, ok: true as const, items: items.filter(isValid) }),
          err => ({ f, ok: false as const, items: [] as NewsItem[], error: String(err).slice(0, 300) }),
        ),
      ),
    )

    let itemsUpserted = 0
    const reports: SourceReport[] = []
    const now = new Date()

    for (const r of settled) {
      reports.push({
        id: r.f.id,
        label: r.f.label,
        country: r.f.country,
        ok: r.ok,
        count: r.items.length,
        ...(r.ok ? {} : { error: (r as { error: string }).error }),
      })

      // upsert estado de la fuente
      await db
        .insert(sources)
        .values({
          id: r.f.id,
          label: r.f.label,
          country: r.f.country,
          lastRunAt: now,
          lastOk: r.ok,
          lastCount: r.items.length,
          lastError: r.ok ? null : (r as { error: string }).error,
        })
        .onConflictDoUpdate({
          target: sources.id,
          set: {
            label: r.f.label,
            lastRunAt: now,
            lastOk: r.ok,
            lastCount: r.items.length,
            lastError: r.ok ? null : (r as { error: string }).error,
          },
        })

      // Dedupe in-batch por id (keep-first): una fuente puede emitir el mismo
      // id dos veces y ON CONFLICT no puede tocar la misma fila 2 veces por stmt.
      const uniqueItems = [...new Map(r.items.map(it => [it.id, it])).values()]

      // upsert idempotente de normas (batch de a 100)
      for (let i = 0; i < uniqueItems.length; i += 100) {
        const batch = uniqueItems.slice(i, i + 100).map(it => ({
          id: it.id,
          title: it.title,
          country: it.country,
          topic: it.topic,
          type: it.type,
          date: it.date,
          relevance: it.relevance,
          excerpt: it.excerpt ?? '',
          source: it.source,
          fullText: it.fullText ?? null,
          authors: it.authors ?? null,
          status: it.status ?? null,
          tipoDocumento: it.tipoDocumento ?? null,
          tipoConteudo: it.tipoConteudo ?? null,
          keywords: it.keywords ?? null,
          sourceUrl: it.sourceUrl ?? null,
          pdfUrl: it.pdfUrl ?? null,
          dataPublicacao: it.dataPublicacao ?? null,
          dataAtualizacao: it.dataAtualizacao ?? null,
          apiDetailUrl: it.apiDetailUrl ?? null,
          comision: it.comision ?? null,
          tramitaciones: it.tramitaciones ?? null,
          sourceId: r.f.id,
          lastSeenAt: now,
        }))
        if (batch.length === 0) continue
        await db
          .insert(normas)
          .values(batch)
          .onConflictDoUpdate({
            target: normas.id,
            set: {
              title: sql`excluded.title`,
              country: sql`excluded.country`,
              topic: sql`excluded.topic`,
              type: sql`excluded.type`,
              date: sql`excluded.date`,
              relevance: sql`excluded.relevance`,
              excerpt: sql`excluded.excerpt`,
              source: sql`excluded.source`,
              fullText: sql`excluded.full_text`,
              authors: sql`excluded.authors`,
              status: sql`excluded.status`,
              tipoDocumento: sql`excluded.tipo_documento`,
              tipoConteudo: sql`excluded.tipo_conteudo`,
              keywords: sql`excluded.keywords`,
              sourceUrl: sql`excluded.source_url`,
              pdfUrl: sql`excluded.pdf_url`,
              dataPublicacao: sql`excluded.data_publicacao`,
              dataAtualizacao: sql`excluded.data_atualizacao`,
              apiDetailUrl: sql`excluded.api_detail_url`,
              comision: sql`excluded.comision`,
              tramitaciones: sql`excluded.tramitaciones`,
              sourceId: sql`excluded.source_id`,
              lastSeenAt: now,
              // firstSeenAt NO se pisa
            },
          })
        itemsUpserted += batch.length
      }
    }

    const okSources = reports.filter(r => r.ok).length
    const failedSources = reports.length - okSources

    await db.insert(ingestRuns).values({
      startedAt,
      finishedAt: new Date(),
      okSources,
      failedSources,
      itemsUpserted,
      detail: reports,
    })

    return { okSources, failedSources, itemsUpserted, reports }
  } finally {
    running = false
  }
}
