// Ejecuta la ingesta standalone: npm run ingest
import { loadConfig } from '../config.js'
import { createDb } from '../db/client.js'
import { runIngest } from './run.js'

const config = loadConfig()
const { db, pool } = createDb(config.DATABASE_URL)

const result = await runIngest(db, config.STATIC_DATA_BASE)
console.log('Ingesta completa:')
console.log(`  fuentes ok: ${result.okSources} · fallidas: ${result.failedSources} · upserted: ${result.itemsUpserted}`)
for (const r of result.reports) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.id} (${r.country}) → ${r.count}${r.error ? ` · ${r.error.slice(0, 80)}` : ''}`)
}
await pool.end()
