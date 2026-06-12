import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

export type Db = ReturnType<typeof createDb>['db']

export function createDb(databaseUrl: string) {
  // SSL solo para el proxy público de Railway; la red interna
  // (postgres.railway.internal) NO soporta SSL.
  const isInternal = /\.railway\.internal/.test(databaseUrl)
  const needsSsl = !isInternal && /rlwy\.net|sslmode=require/.test(databaseUrl) && !/sslmode=disable/.test(databaseUrl)
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  })
  const db = drizzle(pool, { schema })
  return { db, pool }
}
