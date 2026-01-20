import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('products')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('seller_id', 'integer', (col) =>
      col.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('price', 'integer', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) =>
      col.notNull().defaultTo('available')
    )
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute()

  await db.schema
    .createIndex('idx_products_seller_id')
    .on('products')
    .column('seller_id')
    .execute()

  await db.schema
    .createIndex('idx_products_status')
    .on('products')
    .column('status')
    .execute()

  await sql`ALTER TABLE products ADD CONSTRAINT chk_status CHECK (status IN ('available', 'negotiating', 'sold'))`.execute(db)

  await db.schema
    .createTable('product_images')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) =>
      col.references('products.id').onDelete('cascade')
    )
    .addColumn('path', 'varchar(500)', (col) => col.notNull())
    .addColumn('display_order', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('product_images').execute()
  await db.schema.dropTable('products').execute()
}
