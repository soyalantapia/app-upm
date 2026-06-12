import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

export type Db = ReturnType<typeof createDb>['db']

export function createDb(databaseUrl: string) {
  const needsSsl = /railway|rlwy\.net|proxy/.test(databaseUrl) && !/sslmode=disable/.test(databaseUrl)
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  })
  const db = drizzle(pool, { schema })
  return { db, pool }
}
