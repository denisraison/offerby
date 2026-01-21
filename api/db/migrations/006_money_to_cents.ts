import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`UPDATE products SET price = ROUND(price * 100)`.execute(db)
  await sql`ALTER TABLE products ALTER COLUMN price TYPE integer USING price::integer`.execute(db)

  await sql`UPDATE counter_offers SET amount = ROUND(amount * 100)`.execute(db)
  await sql`ALTER TABLE counter_offers ALTER COLUMN amount TYPE integer USING amount::integer`.execute(db)

  await sql`UPDATE transactions SET final_price = ROUND(final_price * 100)`.execute(db)
  await sql`ALTER TABLE transactions ALTER COLUMN final_price TYPE integer USING final_price::integer`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE products ALTER COLUMN price TYPE decimal(10,2)`.execute(db)
  await sql`UPDATE products SET price = price / 100.0`.execute(db)

  await sql`ALTER TABLE counter_offers ALTER COLUMN amount TYPE decimal(10,2)`.execute(db)
  await sql`UPDATE counter_offers SET amount = amount / 100.0`.execute(db)

  await sql`ALTER TABLE transactions ALTER COLUMN final_price TYPE decimal(10,2)`.execute(db)
  await sql`UPDATE transactions SET final_price = final_price / 100.0`.execute(db)
}
