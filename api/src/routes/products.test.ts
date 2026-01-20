import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { products } from './products.js'

vi.mock('../../db/repositories/products.js', () => ({
  findAvailableProducts: vi.fn(),
  findProductById: vi.fn(),
  findProductImages: vi.fn(),
  createProduct: vi.fn(),
  linkImageToProduct: vi.fn(),
  updateProductStatus: vi.fn(),
}))

vi.mock('../../db/repositories/offers.js', () => ({
  createOffer: vi.fn(),
  findPendingOffer: vi.fn(),
  findProductOffers: vi.fn(),
}))

vi.mock('../../db/repositories/transactions.js', () => ({
  createTransaction: vi.fn(),
}))

const {
  findAvailableProducts,
  findProductById,
  findProductImages,
  createProduct,
  linkImageToProduct,
  updateProductStatus,
} = await import('../../db/repositories/products.js')

const { findProductOffers } = await import('../../db/repositories/offers.js')
const { createTransaction } = await import('../../db/repositories/transactions.js')

const TEST_SECRET = 'test-secret-key'
const BUYER_ID = 1
const SELLER_ID = 2

const makeToken = (userId: number) =>
  sign({ sub: userId, email: `user${userId}@test.com` }, TEST_SECRET, 'HS256')

const app = new Hono()
app.route('/api/products', products)

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns available products', async () => {
    vi.mocked(findAvailableProducts).mockResolvedValue([
      { id: 1, name: 'Available', price: 10000, status: 'available', image: null, sellerName: 'Test' },
    ])

    const res = await app.request('/api/products')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].name).toBe('Available')
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

  it('creates product and returns its id', async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: 42 })
    vi.mocked(linkImageToProduct).mockResolvedValue([])

    const token = await makeToken(SELLER_ID)
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Product',
        price: 5000,
        imageIds: [1, 2],
      }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe(42)
  })

  it('validates price is positive', async () => {
    const token = await makeToken(SELLER_ID)
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Product',
        price: 0,
      }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Price must be a positive integer (cents)')
  })

  it('validates price rejects negative', async () => {
    const token = await makeToken(SELLER_ID)
    const res = await app.request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Test Product',
        price: -10,
      }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Price must be a positive integer (cents)')
  })
})

const baseProduct = {
  id: 10,
  name: 'Test Product',
  description: 'A product',
  price: 10000,
  status: 'available' as const,
  reservedBy: null,
  version: 1,
  createdAt: new Date(),
  sellerId: SELLER_ID,
  sellerName: 'Seller',
}

describe('GET /products/:id permissions', () => {
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
    vi.mocked(findProductImages).mockResolvedValue([])
  })

  it('buyer sees canMakeInitialOffer=true on available product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const buyerToken = await makeToken(BUYER_ID)
    const res = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.canMakeInitialOffer).toBe(true)
    expect(json.canPurchase).toBe(true)
  })

  it('buyer with pending offer sees canMakeInitialOffer=false', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([
      {
        id: 100,
        buyerId: BUYER_ID,
        amount: 5000,
        proposedBy: 'buyer',
        status: 'pending',
        parentOfferId: null,
        createdAt: new Date(),
        buyerName: 'Buyer',
      },
    ])

    const buyerToken = await makeToken(BUYER_ID)
    const res = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.canMakeInitialOffer).toBe(false)
  })

  it('seller sees canMakeInitialOffer=false on own product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const sellerToken = await makeToken(SELLER_ID)
    const res = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${sellerToken}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.canMakeInitialOffer).toBe(false)
    expect(json.canPurchase).toBe(false)
  })

  it('offer shows canCounter=true for opposite party only', async () => {
    const buyerOffer = {
      id: 100,
      buyerId: BUYER_ID,
      amount: 5000,
      proposedBy: 'buyer' as const,
      status: 'pending' as const,
      parentOfferId: null,
      createdAt: new Date(),
      buyerName: 'Buyer',
    }
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([buyerOffer])

    const sellerToken = await makeToken(SELLER_ID)
    const sellerRes = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${sellerToken}` },
    })
    const sellerJson = await sellerRes.json()
    expect(sellerJson.offers[0].canCounter).toBe(true)
    expect(sellerJson.offers[0].canAccept).toBe(true)

    const buyerToken = await makeToken(BUYER_ID)
    const buyerRes = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    })
    const buyerJson = await buyerRes.json()
    expect(buyerJson.offers[0].canCounter).toBe(false)
    expect(buyerJson.offers[0].canAccept).toBe(false)
  })

  it('sold product shows canPurchase=false', async () => {
    const soldProduct = { ...baseProduct, status: 'sold' as const }
    vi.mocked(findProductById).mockResolvedValue(soldProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const buyerToken = await makeToken(BUYER_ID)
    const res = await app.request('/api/products/10', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.canPurchase).toBe(false)
    expect(json.canMakeInitialOffer).toBe(false)
  })
})

describe('POST /products/:id/purchase', () => {
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

  it('direct purchase uses listing price', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(updateProductStatus).mockResolvedValue(true)
    vi.mocked(createTransaction).mockResolvedValue({ id: 1, createdAt: new Date() })

    const buyerToken = await makeToken(BUYER_ID)
    const res = await app.request('/api/products/10/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.finalPrice).toBe(10000)
    expect(createTransaction).toHaveBeenCalledWith(10, BUYER_ID, SELLER_ID, 10000, undefined)
  })

  it('purchase with accepted offer uses negotiated price', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([
      {
        id: 100,
        buyerId: BUYER_ID,
        amount: 7500,
        proposedBy: 'seller',
        status: 'accepted',
        parentOfferId: null,
        createdAt: new Date(),
        buyerName: 'Buyer',
      },
    ])
    vi.mocked(updateProductStatus).mockResolvedValue(true)
    vi.mocked(createTransaction).mockResolvedValue({ id: 2, createdAt: new Date() })

    const buyerToken = await makeToken(BUYER_ID)
    const res = await app.request('/api/products/10/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ offerId: 100 }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.finalPrice).toBe(7500)
    expect(createTransaction).toHaveBeenCalledWith(10, BUYER_ID, SELLER_ID, 7500, 100)
  })

  it('reserved product can only be purchased by reserved buyer', async () => {
    const reservedProduct = { ...baseProduct, status: 'reserved' as const, reservedBy: BUYER_ID }
    vi.mocked(findProductById).mockResolvedValue(reservedProduct)

    const otherBuyerId = 3
    const otherBuyerToken = await makeToken(otherBuyerId)
    const res = await app.request('/api/products/10/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherBuyerToken}`,
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Product is reserved for another buyer')
  })
})
