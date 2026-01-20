import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'
import { sign } from 'hono/jwt'
import type { Database } from '../../../db/types.js'

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/linkby_test'

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-integration'

const dialect = new PostgresDialect({
  pool: new pg.Pool({ connectionString: TEST_DATABASE_URL }),
})

export const testDb = new Kysely<Database>({ dialect })

export async function truncateAll() {
  await sql`TRUNCATE transactions, counter_offers, product_images, products, users RESTART IDENTITY CASCADE`.execute(
    testDb
  )
}

export async function createTestUser(name: string, email: string) {
  const passwordHash = '$2b$10$dummyhashforintegrationtests0000000000000'
  return testDb
    .insertInto('users')
    .values({ email, name, password_hash: passwordHash })
    .returning(['id', 'email', 'name'])
    .executeTakeFirstOrThrow()
}

export async function createTestProduct(
  sellerId: number,
  name: string,
  price: number
) {
  return testDb
    .insertInto('products')
    .values({
      seller_id: sellerId,
      name,
      price,
      status: 'available',
    })
    .returning(['id', 'name', 'price', 'status', 'version'])
    .executeTakeFirstOrThrow()
}

export function makeToken(userId: number, email: string) {
  return sign({ sub: userId, email }, TEST_JWT_SECRET, 'HS256')
}

export async function closeTestDb() {
  await testDb.destroy()
}

