import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { products } from './products.js'

vi.mock('../services/product.js', () => ({
  listAvailableProducts: vi.fn(),
  listSellerProducts: vi.fn(),
  getProductDetails: vi.fn(),
  createProduct: vi.fn(),
  createInitialOffer: vi.fn(),
  purchaseProduct: vi.fn(),
}))

const {
  listAvailableProducts,
  listSellerProducts,
  getProductDetails,
  createProduct,
  createInitialOffer,
  purchaseProduct,
} = await import('../services/product.js')

const TEST_SECRET = 'test-secret-key'
const USER_ID = 1

const makeToken = (userId: number) =>
  sign({ sub: userId, email: `user${userId}@test.com` }, TEST_SECRET, 'HS256')

const app = new Hono()
app.route('/api/products', products)

describe('GET /api/products', () => {
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
    const res = await app.request('/api/products')
    expect(res.status).toBe(401)
  })

  it('returns products from service', async () => {
    vi.mocked(listAvailableProducts).mockResolvedValue([
      { id: 1, name: 'Product 1', price: 1000, status: 'available', image: null, sellerName: 'Seller' },
    ])

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe(1)
  })

  it('returns seller products when seller=me', async () => {
    vi.mocked(listSellerProducts).mockResolvedValue([
      { id: 2, name: 'My Product', price: 2000, status: 'available', image: null, offerCount: 0 },
    ])

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products?seller=me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].id).toBe(2)
  })
})

describe('GET /api/products/:id', () => {
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
    const res = await app.request('/api/products/1')
    expect(res.status).toBe(401)
  })

  it('returns product details', async () => {
    vi.mocked(getProductDetails).mockResolvedValue({
      id: 10,
      name: 'Test',
      description: null,
      price: 10000,
      status: 'available',
      reservedBy: null,
      version: 1,
      createdAt: new Date(),
      sellerId: 2,
      sellerName: 'Seller',
      images: [],
      offers: [],
      canPurchase: true,
      canMakeInitialOffer: true,
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(10)
    expect(json.name).toBe('Test')
    expect(json.canPurchase).toBe(true)
  })
})

describe('POST /api/products', () => {
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
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', price: 1000 }),
    })
    expect(res.status).toBe(401)
  })

  it('validates name is required', async () => {
    const token = await makeToken(USER_ID)
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
    const token = await makeToken(USER_ID)
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
    const token = await makeToken(USER_ID)
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
    vi.mocked(createProduct).mockResolvedValue({ id: 42 })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Test Product', price: 5000, imageIds: [1, 2] }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(42)
  })
})

describe('POST /api/products/:id/offers', () => {
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
    const res = await app.request('/api/products/1/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000 }),
    })
    expect(res.status).toBe(401)
  })

  it('creates offer and returns it', async () => {
    vi.mocked(createInitialOffer).mockResolvedValue({
      id: 100,
      amount: 5000,
      proposedBy: 'buyer',
      status: 'pending',
      createdAt: new Date(),
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products/10/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 5000 }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(100)
    expect(json.amount).toBe(5000)
  })
})

describe('POST /api/products/:id/purchase', () => {
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
    const res = await app.request('/api/products/1/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('purchases product and returns transaction', async () => {
    vi.mocked(purchaseProduct).mockResolvedValue({
      transactionId: 1,
      finalPrice: 10000,
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products/10/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.transactionId).toBe(1)
    expect(json.finalPrice).toBe(10000)
  })

  it('purchases with offer price', async () => {
    vi.mocked(purchaseProduct).mockResolvedValue({
      transactionId: 2,
      finalPrice: 7500,
    })

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/products/10/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ offerId: 100 }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.transactionId).toBe(2)
    expect(json.finalPrice).toBe(7500)
  })
})
