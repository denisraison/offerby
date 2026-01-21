import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { products } from './products.js'
import type { AppVariables } from '../context.js'
import { testDb, testServices, truncateAll } from '../__tests__/setup.js'
import { createTestUser, createTestProduct, createTestOffer, acceptTestOffer, makeToken } from '../__tests__/factories.js'

const TEST_SECRET = 'test-secret-for-integration'

function createTestApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('services', testServices)
    await next()
  })
  app.route('/api/products', products)
  return app
}

describe('GET /api/products', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  beforeEach(() => truncateAll())

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/products')
    expect(res.status).toBe(401)
  })

  it('returns products from service', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    await createTestProduct(seller.id, 'Product 1', 1000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const token = await makeToken(buyer.id, buyer.email)

    const res = await app.request('/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.items[0].name).toBe('Product 1')
  })

  it('returns seller products when seller=me', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    await createTestProduct(seller.id, 'My Product', 2000)

    const token = await makeToken(seller.id, seller.email)

    const res = await app.request('/api/products?seller=me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.items[0].name).toBe('My Product')
  })
})

describe('GET /api/products/:id', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  beforeEach(() => truncateAll())

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/products/1')
    expect(res.status).toBe(401)
  })

  it('returns product details', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Test', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const token = await makeToken(buyer.id, buyer.email)

    const res = await app.request(`/api/products/${product.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(product.id)
    expect(json.name).toBe('Test')
    expect(json.canPurchase).toBe(true)
  })
})

describe('POST /api/products', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  beforeEach(() => truncateAll())

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', price: 1000 }),
    })
    expect(res.status).toBe(401)
  })

  it('validates name is required', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ price: 1000 }),
    })

    expect(res.status).toBe(400)
  })

  it('validates price must be positive', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test', price: 0 }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Price must be a positive integer (cents)')
  })

  it('validates price rejects negative', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test', price: -10 }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Price must be a positive integer (cents)')
  })

  it('creates product and returns id', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test Product', price: 5000 }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
  })
})

describe('POST /api/products/:id/offers', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  beforeEach(() => truncateAll())

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/products/1/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates offer and returns it', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const token = await makeToken(buyer.id, buyer.email)

    const res = await app.request(`/api/products/${product.id}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 5000 }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.amount).toBe(5000)
  })

  it('prevents duplicate offers from same buyer under concurrent requests', async () => {
    const iterations = 10

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer = await createTestUser('Buyer', `buyer${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)
      const buyerToken = await makeToken(buyer.id, buyer.email)

      const [res1, res2] = await Promise.all([
        app.request(`/api/products/${product.id}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${buyerToken}`,
          },
          body: JSON.stringify({ amount: 5000 }),
        }),
        app.request(`/api/products/${product.id}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${buyerToken}`,
          },
          body: JSON.stringify({ amount: 6000 }),
        }),
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

  it('allows concurrent offers from different buyers', async () => {
    const iterations = 10

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer1 = await createTestUser('Buyer1', `buyer1-${i}@test.com`)
      const buyer2 = await createTestUser('Buyer2', `buyer2-${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)

      const [res1, res2] = await Promise.all([
        app.request(`/api/products/${product.id}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await makeToken(buyer1.id, buyer1.email)}`,
          },
          body: JSON.stringify({ amount: 5000 }),
        }),
        app.request(`/api/products/${product.id}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await makeToken(buyer2.id, buyer2.email)}`,
          },
          body: JSON.stringify({ amount: 6000 }),
        }),
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

describe('POST /api/products/:id/purchase', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  beforeEach(() => truncateAll())

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/products/1/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('purchases product and returns transaction', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const token = await makeToken(buyer.id, buyer.email)

    const res = await app.request(`/api/products/${product.id}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.transactionId).toBeDefined()
    expect(json.finalPrice).toBe(10000)
  })

  it('purchases with offer price', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const offer = await createTestOffer(product.id, buyer.id, 7500)
    await acceptTestOffer(offer.id, seller.id)
    const token = await makeToken(buyer.id, buyer.email)

    const res = await app.request(`/api/products/${product.id}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ offerId: offer.id }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.transactionId).toBeDefined()
    expect(json.finalPrice).toBe(7500)
  })

  it('prevents double-purchase under concurrent requests', async () => {
    const iterations = 10
    let raceTriggered = 0

    for (let i = 0; i < iterations; i++) {
      await truncateAll()
      const seller = await createTestUser('Seller', `seller${i}@test.com`)
      const buyer1 = await createTestUser('Buyer1', `buyer1-${i}@test.com`)
      const buyer2 = await createTestUser('Buyer2', `buyer2-${i}@test.com`)
      const product = await createTestProduct(seller.id, 'Test Product', 10000)

      const [res1, res2] = await Promise.all([
        app.request(`/api/products/${product.id}/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await makeToken(buyer1.id, buyer1.email)}`,
          },
          body: JSON.stringify({}),
        }),
        app.request(`/api/products/${product.id}/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await makeToken(buyer2.id, buyer2.email)}`,
          },
          body: JSON.stringify({}),
        }),
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
})
