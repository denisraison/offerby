import { Kysely, Migrator, FileMigrationProvider } from 'kysely'
import { KyselyPGlite } from 'kysely-pglite'
import * as path from 'path'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import type { Database } from '../../db/types.js'
import { createRepositories } from '../../db/repositories/index.js'
import { createServices } from '../services/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let kyselyPglite: KyselyPGlite | null = null

async function createTestDb(): Promise<Kysely<Database>> {
  kyselyPglite = await KyselyPGlite.create()
  const db = new Kysely<Database>({
    dialect: kyselyPglite.dialect,
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../../db/migrations'),
    }),
  })

  const { error } = await migrator.migrateToLatest()
  if (error) throw error

  return db
}

export const testDb = await createTestDb()
export const testRepos = createRepositories(testDb)
export const testServices = createServices(testRepos)

export async function truncateAll() {
  await testDb.deleteFrom('transactions').execute()
  await testDb.deleteFrom('counter_offers').execute()
  await testDb.deleteFrom('product_images').execute()
  await testDb.deleteFrom('products').execute()
  await testDb.deleteFrom('users').execute()
}

export async function closeTestDb() {
  // No-op: PGlite runs in-memory and is shared across test files
}
