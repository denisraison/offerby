import { Kysely, PostgresDialect } from 'kysely'
import type { Database } from './types.js'

async function createDb(): Promise<Kysely<Database>> {
  if (process.env.USE_PGLITE === 'true') {
    const { createPgliteDb } = await import('./pglite.js')
    return createPgliteDb()
  }

  const pg = await import('pg')
  const dialect = new PostgresDialect({
    pool: new pg.default.Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  })
  return new Kysely<Database>({ dialect })
}

export const db = await createDb()
