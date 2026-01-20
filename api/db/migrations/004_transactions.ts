import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('transactions')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) =>
      col.notNull().references('products.id').unique()
    )
    .addColumn('buyer_id', 'integer', (col) =>
      col.notNull().references('users.id')
    )
    .addColumn('seller_id', 'integer', (col) =>
      col.notNull().references('users.id')
    )
    .addColumn('final_price', 'decimal(10,2)', (col) => col.notNull())
    .addColumn('offer_id', 'integer', (col) =>
      col.references('counter_offers.id')
    )
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('transactions').execute()
}
