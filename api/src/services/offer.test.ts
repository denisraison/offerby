import { describe, it, expect, vi, beforeEach } from 'vitest'
import { counterOffer, acceptOffer } from './offer.js'
import { InvalidStateError, ForbiddenError, NotFoundError, ConflictError } from './errors.js'

vi.mock('../../db/repositories/offers.js', () => ({
  findOfferById: vi.fn(),
  counterOffer: vi.fn(),
  acceptOfferWithReservation: vi.fn(),
}))

vi.mock('../../db/repositories/products.js', () => ({
  findProductById: vi.fn(),
}))

const { findOfferById, counterOffer: counterOfferRepo, acceptOfferWithReservation } = await import(
  '../../db/repositories/offers.js'
)
const { findProductById } = await import('../../db/repositories/products.js')

const BUYER_ID = 1
const SELLER_ID = 2
const PRODUCT_ID = 10
const OFFER_ID = 100

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

describe('counterOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('seller can counter buyer offer', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)
    vi.mocked(counterOfferRepo).mockResolvedValue({
      id: 101,
      amount: 6000,
      proposedBy: 'seller',
      status: 'pending',
      createdAt: new Date(),
    })

    const result = await counterOffer(OFFER_ID, SELLER_ID, 6000)

    expect(result.id).toBe(101)
    expect(result.amount).toBe(6000)
    expect(result.proposedBy).toBe('seller')
  })

  it('buyer cannot counter own offer', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)

    try {
      await counterOffer(OFFER_ID, BUYER_ID, 5500)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot counter your own offer')
    }
  })

  it('buyer can counter seller counter', async () => {
    const sellerCounter = { ...basePendingOffer, proposedBy: 'seller' as const }
    vi.mocked(findOfferById).mockResolvedValue(sellerCounter)
    vi.mocked(counterOfferRepo).mockResolvedValue({
      id: 102,
      amount: 5500,
      proposedBy: 'buyer',
      status: 'pending',
      createdAt: new Date(),
    })

    const result = await counterOffer(OFFER_ID, BUYER_ID, 5500)

    expect(result.id).toBe(102)
    expect(result.amount).toBe(5500)
    expect(result.proposedBy).toBe('buyer')
  })

  it('seller cannot counter own counter', async () => {
    const sellerCounter = { ...basePendingOffer, proposedBy: 'seller' as const }
    vi.mocked(findOfferById).mockResolvedValue(sellerCounter)

    try {
      await counterOffer(OFFER_ID, SELLER_ID, 6500)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot counter your own offer')
    }
  })

  it('throws NotFoundError for missing offer', async () => {
    vi.mocked(findOfferById).mockResolvedValue(undefined)

    await expect(counterOffer(OFFER_ID, SELLER_ID, 6000)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for non-pending offer', async () => {
    const acceptedOffer = { ...basePendingOffer, status: 'accepted' as const, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(acceptedOffer)

    try {
      await counterOffer(OFFER_ID, SELLER_ID, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Offer is not pending')
    }
  })

  it('throws InvalidStateError for sold product', async () => {
    const offerOnSoldProduct = { ...basePendingOffer, proposedBy: 'buyer' as const, productStatus: 'sold' as const }
    vi.mocked(findOfferById).mockResolvedValue(offerOnSoldProduct)

    try {
      await counterOffer(OFFER_ID, SELLER_ID, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws ForbiddenError for unrelated user', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)

    try {
      await counterOffer(OFFER_ID, 999, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as Error).message).toBe('Not authorised to counter this offer')
    }
  })
})

describe('acceptOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('seller can accept buyer offer', async () => {
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

    const result = await acceptOffer(OFFER_ID, SELLER_ID)

    expect(result.success).toBe(true)
    expect(result.offerId).toBe(OFFER_ID)
    expect(result.amount).toBe(5000)
  })

  it('buyer cannot accept own offer', async () => {
    const buyerOffer = { ...basePendingOffer, proposedBy: 'buyer' as const }
    vi.mocked(findOfferById).mockResolvedValue(buyerOffer)

    try {
      await acceptOffer(OFFER_ID, BUYER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot accept your own offer')
    }
  })

  it('throws ConflictError on version conflict', async () => {
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
    vi.mocked(acceptOfferWithReservation).mockRejectedValue(new Error('Product version conflict'))

    try {
      await acceptOffer(OFFER_ID, SELLER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError)
      expect((err as Error).message).toBe('Product was modified by another user')
    }
  })
})
