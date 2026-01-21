import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { offers } from './offers.js'
import type { AppVariables } from '../context.js'
import { testServices, truncateAll } from '../__tests__/setup.js'
import { createTestUser, createTestProduct, createTestOffer, makeToken } from '../__tests__/factories.js'

const TEST_SECRET = 'test-secret-for-integration'

function createTestApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('services', testServices)
    await next()
  })
  app.route('/api/offers', offers)
  return app
}

describe('GET /api/offers', () => {
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
    const res = await app.request('/api/offers?status=pending&seller=me')
    expect(res.status).toBe(401)
  })

  it('returns offers list', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Test', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    await createTestOffer(product.id, buyer.id, 5000)

    const token = await makeToken(seller.id, seller.email)

    const res = await app.request('/api/offers?status=pending&seller=me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.items[0].amount).toBe(5000)
  })
})

describe('POST /api/offers/:id/counter', () => {
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
    const res = await app.request('/api/offers/1/counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000 }),
    })
    expect(res.status).toBe(401)
  })

  it('validates amount is required', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const res = await app.request('/api/offers/1/counter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })

  it('creates counter offer and returns it', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const offer = await createTestOffer(product.id, buyer.id, 5000)

    const token = await makeToken(seller.id, seller.email)

    const res = await app.request(`/api/offers/${offer.id}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 6000 }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.amount).toBe(6000)
  })
})

describe('POST /api/offers/:id/accept', () => {
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
    const res = await app.request('/api/offers/1/accept', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('accepts offer and returns result', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const offer = await createTestOffer(product.id, buyer.id, 5000)

    const token = await makeToken(seller.id, seller.email)

    const res = await app.request(`/api/offers/${offer.id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.offerId).toBe(offer.id)
  })
})
