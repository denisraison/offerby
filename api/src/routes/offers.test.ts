import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { offers } from './offers.js'

vi.mock('../services/offer.js', () => ({
  listOffers: vi.fn(),
  counterOffer: vi.fn(),
  acceptOffer: vi.fn(),
}))

const { listOffers, counterOffer, acceptOffer } = await import('../services/offer.js')

const app = new Hono()
app.route('/api/offers', offers)

const TEST_SECRET = 'test-secret-key'
const USER_ID = 1

const makeToken = (userId: number) =>
  sign({ sub: userId, email: `user${userId}@test.com` }, TEST_SECRET, 'HS256')

describe('GET /api/offers', () => {
  const originalSecret = process.env.JWT_SECRET

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/offers?status=pending&seller=me')
    expect(res.status).toBe(401)
  })

  it('returns offers list', async () => {
    vi.mocked(listOffers).mockResolvedValue([
      { id: 1, productId: 10, buyerId: 1, amount: 5000, createdAt: new Date(), productName: 'Test', productPrice: 10000, buyerName: 'Buyer' },
    ])

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/offers?status=pending&seller=me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe(1)
  })
})

describe('POST /api/offers/:id/counter', () => {
  const originalSecret = process.env.JWT_SECRET

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/offers/1/counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000 }),
    })
    expect(res.status).toBe(401)
  })

  it('validates amount is required', async () => {
    const token = await makeToken(USER_ID)
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
    vi.mocked(counterOffer).mockResolvedValue({
      id: 101,
      amount: 6000,
      proposedBy: 'seller',
      status: 'pending',
      createdAt: new Date(),
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/offers/100/counter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 6000 }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(101)
    expect(json.amount).toBe(6000)
  })
})

describe('POST /api/offers/:id/accept', () => {
  const originalSecret = process.env.JWT_SECRET

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/offers/1/accept', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('accepts offer and returns result', async () => {
    vi.mocked(acceptOffer).mockResolvedValue({
      success: true,
      offerId: 100,
      amount: 5000,
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/offers/100/accept', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.offerId).toBe(100)
  })
})
