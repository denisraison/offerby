import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE counter_offers ALTER COLUMN created_at SET DEFAULT now()`.execute(db)
  await sql`ALTER TABLE products ALTER COLUMN created_at SET DEFAULT now()`.execute(db)
  await sql`ALTER TABLE products ALTER COLUMN updated_at SET DEFAULT now()`.execute(db)
  await sql`ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // No rollback needed, the fix is correct
}
