// Backfill / refresh incremental de embeddings.  Uso: npm run embed
//
// Corre el modelo LOCAL (transformers.js) — pensado para ejecutarse FUERA del
// server vivo (esta máquina o un job aparte) para no arriesgar la RAM de Railway.
// Solo embebe normas sin embedding o cuyo content_hash cambió (deltas).
import pg from 'pg'
import { loadConfig } from '../config.js'
import { contentHash, embedPassage, toVectorLiteral } from './embedder.js'

const config = loadConfig()
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: /rlwy\.net|railway/.test(config.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})

type Row = { id: string; title: string; excerpt: string; full_text: string | null; content_hash: string | null; has_emb: boolean }

const { rows } = await pool.query<Row>(
  `select id, title, coalesce(excerpt,'') as excerpt, full_text, content_hash, (embedding is not null) as has_emb from normas`,
)

const pending = rows.filter(r => {
  const h = contentHash(r.title, r.excerpt, r.full_text)
  return !r.has_emb || r.content_hash !== h
})

console.log(`normas: ${rows.length} · pendientes de embeber: ${pending.length}`)
if (pending.length === 0) {
  console.log('nada para hacer — todo embebido y al día ✅')
  await pool.end()
  process.exit(0)
}

let done = 0
const t0 = Date.now()
for (const r of pending) {
  const h = contentHash(r.title, r.excerpt, r.full_text)
  const vec = await embedPassage(r.title, r.excerpt, r.full_text)
  await pool.query(
    `update normas set embedding = $1::vector, content_hash = $2, embedded_at = now() where id = $3`,
    [toVectorLiteral(vec), h, r.id],
  )
  done++
  if (done % 100 === 0 || done === pending.length) {
    const rate = done / ((Date.now() - t0) / 1000)
    console.log(`  ${done}/${pending.length} (${rate.toFixed(1)}/s)`)
  }
}

const [{ count }] = (await pool.query<{ count: string }>(`select count(*)::int as count from normas where embedding is not null`)).rows
console.log(`✅ embebidas ${done} · total con embedding: ${count}/${rows.length} · ${((Date.now() - t0) / 1000).toFixed(0)}s`)
await pool.end()
