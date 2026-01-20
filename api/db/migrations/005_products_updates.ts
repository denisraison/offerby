import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('products')
    .addColumn('reserved_by', 'integer', (col) =>
      col.references('users.id')
    )
    .execute()

  await db.schema
    .alterTable('products')
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(1))
    .execute()

  await sql`ALTER TABLE products ALTER COLUMN price TYPE decimal(10,2)`.execute(db)

  await sql`ALTER TABLE products DROP CONSTRAINT chk_status`.execute(db)
  await sql`ALTER TABLE products ADD CONSTRAINT chk_status CHECK (status IN ('available', 'reserved', 'sold'))`.execute(db)

  await sql`UPDATE products SET status = 'available' WHERE status = 'negotiating'`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE products DROP CONSTRAINT chk_status`.execute(db)
  await sql`ALTER TABLE products ADD CONSTRAINT chk_status CHECK (status IN ('available', 'negotiating', 'sold'))`.execute(db)

  await sql`ALTER TABLE products ALTER COLUMN price TYPE integer USING price::integer`.execute(db)

  await db.schema.alterTable('products').dropColumn('version').execute()
  await db.schema.alterTable('products').dropColumn('reserved_by').execute()
}
