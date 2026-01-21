import { Kysely, Migrator, FileMigrationProvider } from 'kysely'
import { KyselyPGlite } from 'kysely-pglite'
import * as path from 'path'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import type { Database } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const dataDir = process.env.PGLITE_DATA_DIR || './data/pglite'

let kyselyPglite: KyselyPGlite | null = null

export async function createPgliteDb(): Promise<Kysely<Database>> {
  await fs.mkdir(dataDir, { recursive: true })

  kyselyPglite = await KyselyPGlite.create({ dataDir })
  const db = new Kysely<Database>({
    dialect: kyselyPglite.dialect,
  })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, './migrations'),
    }),
  })

  console.log('Running PGlite migrations...')
  const { error, results } = await migrator.migrateToLatest()

  if (results?.length) {
    for (const result of results) {
      if (result.status === 'Success') {
        console.log(`  Migration "${result.migrationName}" applied`)
      } else if (result.status === 'Error') {
        console.error(`  Migration "${result.migrationName}" failed`)
      }
    }
  }

  if (error) throw error

  console.log('PGlite ready')
  return db
}
