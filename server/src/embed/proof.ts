// Demo: FTS (palabra clave) vs SEMÁNTICA (significado) sobre la misma query.
// Uso: npx tsx src/embed/proof.ts "tu pregunta"
import pg from 'pg'
import { loadConfig } from '../config.js'
import { embedQuery, toVectorLiteral } from './embedder.js'

const config = loadConfig()
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: /rlwy\.net|railway/.test(config.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})
const query = process.argv[2] ?? '¿qué se hizo para proteger los ríos y el agua de la contaminación?'
console.log('\n════════════════════════════════════════════════════════════')
console.log('QUERY:', query)
console.log('════════════════════════════════════════════════════════════')

const ftsSql = `to_tsvector('spanish', title||' '||coalesce(excerpt,'')||' '||coalesce(full_text,''))`
const fts = await pool.query(
  `select title from normas where ${ftsSql} @@ plainto_tsquery('spanish',$1)
   order by ts_rank(${ftsSql}, plainto_tsquery('spanish',$1)) desc limit 5`,
  [query],
)
console.log('\n── FTS (palabra clave) ──')
if (fts.rows.length === 0) console.log('   (0 resultados — no hay match léxico)')
fts.rows.forEach((r: { title: string }, i: number) => console.log(`  ${i + 1}. ${r.title.slice(0, 72)}`))

const vec = await embedQuery(query)
const sem = await pool.query(
  `select title, round((1-(embedding <=> $1::vector))::numeric,3) as sim
   from normas where embedding is not null
   order by embedding <=> $1::vector limit 5`,
  [toVectorLiteral(vec)],
)
console.log('\n── SEMÁNTICA (significado) ──')
sem.rows.forEach((r: { title: string; sim: string }, i: number) =>
  console.log(`  ${i + 1}. [sim ${r.sim}] ${r.title.slice(0, 64)}`),
)
await pool.end()
