import cron from 'node-cron'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { desc, sql } from 'drizzle-orm'
import { loadConfig } from './config.js'
import { createDb } from './db/client.js'
import { ingestRuns, normas } from './db/schema.js'
import { buildApp } from './app.js'
import { runIngest } from './ingest/run.js'

const config = loadConfig()
const { db } = createDb(config.DATABASE_URL)

// Migraciones al boot (idempotente — drizzle lleva su journal en la DB)
try {
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('migraciones ok')
} catch (err) {
  console.error('migrate falló:', err)
  process.exit(1)
}

const app = await buildApp(config, db)

// Ingesta inmediata al boot si la DB está vacía o el último run tiene >30 min
async function bootIngestIfStale() {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(normas)
    const [last] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.id)).limit(1)
    const staleMs = 30 * 60 * 1000
    const isStale = !last?.finishedAt || Date.now() - last.finishedAt.getTime() > staleMs
    if (count === 0 || isStale) {
      console.log('ingesta de arranque…')
      const r = await runIngest(db, config.STATIC_DATA_BASE)
      console.log(`ingesta boot: ok=${r.okSources} fail=${r.failedSources} upserted=${r.itemsUpserted}`)
    }
  } catch (err) {
    console.error('ingesta boot falló (no bloquea el server):', err)
  }
}

// Cron cada 30 min (lock interno en runIngest evita solapamiento)
cron.schedule('*/30 * * * *', async () => {
  try {
    const r = await runIngest(db, config.STATIC_DATA_BASE)
    console.log(`ingesta cron: ok=${r.okSources} fail=${r.failedSources} upserted=${r.itemsUpserted}`)
  } catch (err) {
    console.error('ingesta cron falló:', err)
  }
})

await app.listen({ host: '0.0.0.0', port: config.PORT })
console.log(`upm-api escuchando en :${config.PORT}`)

// No bloquear el listen: la ingesta de arranque corre en background
void bootIngestIfStale()
