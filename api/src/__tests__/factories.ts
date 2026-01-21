import { sign } from 'hono/jwt'
import { testDb, testRepos, testServices } from './setup.js'

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-for-integration'

export async function createTestUser(name: string, email: string) {
  const passwordHash = '$2b$10$dummyhashforintegrationtests0000000000000'
  return testDb
    .insertInto('users')
    .values({ email, name, password_hash: passwordHash })
    .returning(['id', 'email', 'name'])
    .executeTakeFirstOrThrow()
}

export async function createTestProduct(sellerId: number, name: string, price: number) {
  return testDb
    .insertInto('products')
    .values({ seller_id: sellerId, name, price, status: 'available' })
    .returning(['id', 'name', 'price', 'status', 'version'])
    .executeTakeFirstOrThrow()
}

export function makeToken(userId: number, email: string) {
  return sign({ sub: userId, email }, TEST_JWT_SECRET, 'HS256')
}

export async function createTestOffer(productId: number, buyerId: number, amount: number) {
  return testRepos.offers.create(productId, buyerId, amount)
}

export async function acceptTestOffer(offerId: number, sellerId: number) {
  return testServices.offer.acceptOffer(offerId, sellerId)
}
