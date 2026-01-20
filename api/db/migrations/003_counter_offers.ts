import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('counter_offers')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) =>
      col.notNull().references('products.id').onDelete('cascade')
    )
    .addColumn('buyer_id', 'integer', (col) =>
      col.notNull().references('users.id')
    )
    .addColumn('amount', 'decimal(10,2)', (col) => col.notNull())
    .addColumn('proposed_by', 'varchar(10)', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('parent_offer_id', 'integer', (col) =>
      col.references('counter_offers.id')
    )
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute()

  await db.schema
    .createIndex('idx_counter_offers_product')
    .on('counter_offers')
    .column('product_id')
    .execute()

  await sql`CREATE UNIQUE INDEX idx_one_pending_per_buyer ON counter_offers(product_id, buyer_id) WHERE status = 'pending'`.execute(db)

  await sql`ALTER TABLE counter_offers ADD CONSTRAINT chk_proposed_by CHECK (proposed_by IN ('buyer', 'seller'))`.execute(db)

  await sql`ALTER TABLE counter_offers ADD CONSTRAINT chk_offer_status CHECK (status IN ('pending', 'countered', 'accepted'))`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('counter_offers').execute()
}
