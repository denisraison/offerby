import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import {
  testDb,
  truncateAll,
  createTestUser,
  createTestProduct,
  makeToken,
  closeTestDb,
} from './setup.js'

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/linkby_test'
process.env.JWT_SECRET = 'test-secret-for-integration'

const { products } = await import('../../routes/products.js')
const { offers } = await import('../../routes/offers.js')

const app = new Hono()
app.route('/api/products', products)
app.route('/api/offers', offers)

async function purchase(productId: number, token: string) {
  return app.request(`/api/products/${productId}/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })
}

async function makeOffer(productId: number, amount: number, token: string) {
  return app.request(`/api/products/${productId}/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount }),
  })
}

describe('Concurrency Integration Tests', () => {
  beforeAll(async () => {
    await truncateAll()
  })

  afterAll(async () => {
    await closeTestDb()
  })

  it('prevents double-purchase across multiple iterations', async () => {
    const iterations = 10
    let raceTriggered = 0

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer1 = await createTestUser('Buyer1', `buyer1-${i}@test.com`)
      const buyer2 = await createTestUser('Buyer2', `buyer2-${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)

      const [res1, res2] = await Promise.all([
        purchase(product.id, await makeToken(buyer1.id, buyer1.email)),
        purchase(product.id, await makeToken(buyer2.id, buyer2.email)),
      ])

      const statuses = [res1.status, res2.status].sort((a, b) => a - b)

      expect(statuses[0]).toBe(200)
      expect([400, 409]).toContain(statuses[1])

      if (statuses[1] === 409) raceTriggered++

      const txCount = await testDb
        .selectFrom('transactions')
        .where('product_id', '=', product.id)
        .select(testDb.fn.count('id').as('count'))
        .executeTakeFirst()
      expect(Number(txCount?.count)).toBe(1)
    }

    console.log(`Race triggered ${raceTriggered}/${iterations} iterations`)
  })

  it('prevents duplicate offers across multiple iterations', async () => {
    const iterations = 10

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer = await createTestUser('Buyer', `buyer${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)
      const buyerToken = await makeToken(buyer.id, buyer.email)

      const [res1, res2] = await Promise.all([
        makeOffer(product.id, 5000, buyerToken),
        makeOffer(product.id, 6000, buyerToken),
      ])

      const statuses = [res1.status, res2.status].sort((a, b) => a - b)
      expect(statuses[0]).toBe(201)
      expect(statuses[1]).toBeGreaterThanOrEqual(400)

      const offerCount = await testDb
        .selectFrom('counter_offers')
        .where('product_id', '=', product.id)
        .where('buyer_id', '=', buyer.id)
        .where('status', '=', 'pending')
        .select(testDb.fn.count('id').as('count'))
        .executeTakeFirst()
      expect(Number(offerCount?.count)).toBe(1)
    }
  })

  it('allows concurrent offers from different buyers across iterations', async () => {
    const iterations = 10

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer1 = await createTestUser('Buyer1', `buyer1-${i}@test.com`)
      const buyer2 = await createTestUser('Buyer2', `buyer2-${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)

      const [res1, res2] = await Promise.all([
        makeOffer(product.id, 5000, await makeToken(buyer1.id, buyer1.email)),
        makeOffer(product.id, 6000, await makeToken(buyer2.id, buyer2.email)),
      ])

      expect(res1.status).toBe(201)
      expect(res2.status).toBe(201)

      const offerCount = await testDb
        .selectFrom('counter_offers')
        .where('product_id', '=', product.id)
        .where('status', '=', 'pending')
        .select(testDb.fn.count('id').as('count'))
        .executeTakeFirst()
      expect(Number(offerCount?.count)).toBe(2)
    }
  })
})
