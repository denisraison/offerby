import 'dotenv/config'
import bcrypt from 'bcrypt'
import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types.js'

async function seed() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
  })

  const passwordHash = await bcrypt.hash('password123', 10)

  const users = [
    { email: 'seller@test.com', name: 'Test Seller', password_hash: passwordHash },
    { email: 'buyer1@test.com', name: 'Test Buyer 1', password_hash: passwordHash },
    { email: 'buyer2@test.com', name: 'Test Buyer 2', password_hash: passwordHash },
  ]

  for (const user of users) {
    await db
      .insertInto('users')
      .values(user)
      .onConflict((oc) => oc.column('email').doNothing())
      .execute()
    console.log(`Seeded user: ${user.email}`)
  }

  const seller = await db
    .selectFrom('users')
    .where('email', '=', 'seller@test.com')
    .select('id')
    .executeTakeFirstOrThrow()

  const products = [
    {
      seller_id: seller.id,
      name: 'Vintage Eames Chair',
      description: 'Authentic Herman Miller Eames lounge chair from the 1970s. Original leather with beautiful patina.',
      price: 240000,
    },
    {
      seller_id: seller.id,
      name: 'Mid-Century Desk Lamp',
      description: 'Danish modern desk lamp in brass with adjustable arm. Perfect working condition.',
      price: 18000,
    },
    {
      seller_id: seller.id,
      name: 'Handwoven Moroccan Rug',
      description: 'Authentic Beni Ourain rug, hand-knotted wool. Approximately 2.5m x 1.5m.',
      price: 89000,
    },
  ]

  for (const product of products) {
    const existing = await db
      .selectFrom('products')
      .where('name', '=', product.name)
      .select('id')
      .executeTakeFirst()

    if (!existing) {
      await db.insertInto('products').values(product).execute()
      console.log(`Seeded product: ${product.name}`)
    }
  }

  await db.destroy()
  console.log('Seeding complete')
}

seed()
