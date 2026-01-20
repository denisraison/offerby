import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE products SET price = ROUND(price * 100);
    ALTER TABLE products ALTER COLUMN price TYPE integer USING price::integer;

    UPDATE counter_offers SET amount = ROUND(amount * 100);
    ALTER TABLE counter_offers ALTER COLUMN amount TYPE integer USING amount::integer;

    UPDATE transactions SET final_price = ROUND(final_price * 100);
    ALTER TABLE transactions ALTER COLUMN final_price TYPE integer USING final_price::integer;
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE products ALTER COLUMN price TYPE decimal(10,2);
    UPDATE products SET price = price / 100.0;

    ALTER TABLE counter_offers ALTER COLUMN amount TYPE decimal(10,2);
    UPDATE counter_offers SET amount = amount / 100.0;

    ALTER TABLE transactions ALTER COLUMN final_price TYPE decimal(10,2);
    UPDATE transactions SET final_price = final_price / 100.0;
  `.execute(db)
}
