import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { offers } from './offers.js'

vi.mock('../../db/repositories/offers.js', () => ({
  findOfferById: vi.fn(),
  counterOffer: vi.fn(),
  acceptOfferWithReservation: vi.fn(),
}))

vi.mock('../../db/repositories/products.js', () => ({
  findProductById: vi.fn(),
}))

const { findOfferById, counterOffer, acceptOfferWithReservation } = await import(
  '../../db/repositories/offers.js'
)
const { findProductById } = await import(
  '../../db/repositories/products.js'
)

const app = new Hono()
app.route('/api/offers', offers)

const TEST_SECRET = 'test-secret-key'
const BUYER_ID = 1
const SELLER_ID = 2
const PRODUCT_ID = 10
const OFFER_ID = 100

const makeToken = (userId: number) =>
  sign({ sub: userId, email: `user${userId}@test.com` }, TEST_SECRET, 'HS256')

const basePendingOffer = {
  id: OFFER_ID,
  productId: PRODUCT_ID,
  buyerId: BUYER_ID,
  sellerId: SELLER_ID,
  amount: 5000,
  status: 'pending' as const,
  productStatus: 'available' as const,
  parentOfferId: null,
  createdAt: new Date(),
  listingPrice: 10000,
  sellerName: 'Seller',
  buyerName: 'Buyer',
}

describe('turn-based negotiation', () => {
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

  it('seller can counter buyer offer, buyer cannot', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)
    vi.mocked(counterOffer).mockResolvedValue({
      id: 101,
      amount: 6000,
      proposedBy: 'seller',
      status: 'pending',
      createdAt: new Date(),
    })

    const sellerToken = await makeToken(SELLER_ID)
    const sellerRes = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ amount: 6000 }),
    })
    expect(sellerRes.status).toBe(201)

    const buyerToken = await makeToken(BUYER_ID)
    const buyerRes = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ amount: 5500 }),
    })
    expect(buyerRes.status).toBe(400)
    const json = await buyerRes.json()
    expect(json.error).toBe('Cannot counter your own offer')
  })

  it('buyer can counter seller counter, seller cannot', async () => {
    const sellerCounter = { ...basePendingOffer, proposedBy: 'seller' as const }
    vi.mocked(findOfferById).mockResolvedValue(sellerCounter)
    vi.mocked(counterOffer).mockResolvedValue({
      id: 102,
      amount: 5500,
      proposedBy: 'buyer',
      status: 'pending',
      createdAt: new Date(),
    })

    const buyerToken = await makeToken(BUYER_ID)
    const buyerRes = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ amount: 5500 }),
    })
    expect(buyerRes.status).toBe(201)

    const sellerToken = await makeToken(SELLER_ID)
    const sellerRes = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ amount: 6500 }),
    })
    expect(sellerRes.status).toBe(400)
    const json = await sellerRes.json()
    expect(json.error).toBe('Cannot counter your own offer')
  })

  it('seller can accept buyer offer, buyer cannot accept own offer', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)
    vi.mocked(findProductById).mockResolvedValue({
      id: PRODUCT_ID,
      name: 'Test Product',
      description: null,
      price: 10000,
      status: 'available' as const,
      reservedBy: null,
      version: 1,
      createdAt: new Date(),
      sellerId: SELLER_ID,
      sellerName: 'Seller',
    })
    vi.mocked(acceptOfferWithReservation).mockResolvedValue(true)

    const sellerToken = await makeToken(SELLER_ID)
    const sellerRes = await app.request(`/api/offers/${OFFER_ID}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
    })
    expect(sellerRes.status).toBe(200)
    const sellerJson = await sellerRes.json()
    expect(sellerJson.success).toBe(true)

    const buyerToken = await makeToken(BUYER_ID)
    const buyerRes = await app.request(`/api/offers/${OFFER_ID}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
    })
    expect(buyerRes.status).toBe(400)
    const buyerJson = await buyerRes.json()
    expect(buyerJson.error).toBe('Cannot accept your own offer')
  })

  it('cannot counter or accept after already accepted', async () => {
    const acceptedOffer = { ...basePendingOffer, status: 'accepted' as const, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(acceptedOffer)

    const sellerToken = await makeToken(SELLER_ID)

    const counterRes = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ amount: 6000 }),
    })
    expect(counterRes.status).toBe(400)
    expect((await counterRes.json()).error).toBe('Offer is not pending')

    const acceptRes = await app.request(`/api/offers/${OFFER_ID}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
    })
    expect(acceptRes.status).toBe(400)
    expect((await acceptRes.json()).error).toBe('Offer is not pending')
  })

  it('cannot counter offer on sold product', async () => {
    const offerOnSoldProduct = { ...basePendingOffer, proposedBy: 'buyer' as const, productStatus: 'sold' as const }
    vi.mocked(findOfferById).mockResolvedValue(offerOnSoldProduct)

    const sellerToken = await makeToken(SELLER_ID)
    const res = await app.request(`/api/offers/${OFFER_ID}/counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({ amount: 6000 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Product is already sold')
  })
})
