import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('product_images')
    .addColumn('uploaded_by', 'integer', (col) =>
      col.references('users.id').onDelete('set null')
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('product_images').dropColumn('uploaded_by').execute()
}
