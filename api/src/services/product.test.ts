import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProductDetails, createInitialOffer, purchaseProduct } from './product.js'
import { NotFoundError, InvalidStateError, ForbiddenError, ConflictError, AlreadyExistsError } from './errors.js'

vi.mock('../../db/repositories/products.js', () => ({
  findAvailableProducts: vi.fn(),
  findProductById: vi.fn(),
  findProductImages: vi.fn(),
  createProduct: vi.fn(),
  linkImageToProduct: vi.fn(),
  findProductsBySeller: vi.fn(),
  purchaseProductWithTransaction: vi.fn(),
}))

vi.mock('../../db/repositories/offers.js', () => ({
  createOffer: vi.fn(),
  findPendingOffer: vi.fn(),
  findProductOffers: vi.fn(),
  countPendingOffersByProducts: vi.fn(),
}))

const {
  findProductById,
  findProductImages,
  purchaseProductWithTransaction,
} = await import('../../db/repositories/products.js')

const { createOffer, findPendingOffer, findProductOffers } = await import('../../db/repositories/offers.js')

const BUYER_ID = 1
const SELLER_ID = 2

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

describe('getProductDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findProductImages).mockResolvedValue([])
  })

  it('throws NotFoundError for missing product', async () => {
    vi.mocked(findProductById).mockResolvedValue(undefined)
    vi.mocked(findProductOffers).mockResolvedValue([])

    await expect(getProductDetails(999, BUYER_ID)).rejects.toThrow(NotFoundError)
  })

  it('buyer sees canMakeInitialOffer=true on available product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const result = await getProductDetails(10, BUYER_ID)

    expect(result.canMakeInitialOffer).toBe(true)
    expect(result.canPurchase).toBe(true)
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

    const result = await getProductDetails(10, BUYER_ID)

    expect(result.canMakeInitialOffer).toBe(false)
  })

  it('seller sees canMakeInitialOffer=false on own product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const result = await getProductDetails(10, SELLER_ID)

    expect(result.canMakeInitialOffer).toBe(false)
    expect(result.canPurchase).toBe(false)
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

    const sellerResult = await getProductDetails(10, SELLER_ID)
    expect(sellerResult.offers[0].canCounter).toBe(true)
    expect(sellerResult.offers[0].canAccept).toBe(true)

    const buyerResult = await getProductDetails(10, BUYER_ID)
    expect(buyerResult.offers[0].canCounter).toBe(false)
    expect(buyerResult.offers[0].canAccept).toBe(false)
  })

  it('sold product shows canPurchase=false', async () => {
    const soldProduct = { ...baseProduct, status: 'sold' as const }
    vi.mocked(findProductById).mockResolvedValue(soldProduct)
    vi.mocked(findProductOffers).mockResolvedValue([])

    const result = await getProductDetails(10, BUYER_ID)

    expect(result.canPurchase).toBe(false)
    expect(result.canMakeInitialOffer).toBe(false)
  })
})

describe('createInitialOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws NotFoundError for missing product', async () => {
    vi.mocked(findProductById).mockResolvedValue(undefined)

    await expect(createInitialOffer(999, BUYER_ID, 5000)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for sold product', async () => {
    vi.mocked(findProductById).mockResolvedValue({ ...baseProduct, status: 'sold' as const })

    try {
      await createInitialOffer(10, BUYER_ID, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws InvalidStateError for reserved product', async () => {
    vi.mocked(findProductById).mockResolvedValue({ ...baseProduct, status: 'reserved' as const })

    try {
      await createInitialOffer(10, BUYER_ID, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is reserved')
    }
  })

  it('throws InvalidStateError when offering on own product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)

    try {
      await createInitialOffer(10, SELLER_ID, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot make an offer on your own product')
    }
  })

  it('throws AlreadyExistsError for duplicate pending offer', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findPendingOffer).mockResolvedValue({ id: 100 })

    await expect(createInitialOffer(10, BUYER_ID, 5000)).rejects.toThrow(AlreadyExistsError)
  })

  it('creates offer successfully', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(findPendingOffer).mockResolvedValue(undefined)
    vi.mocked(createOffer).mockResolvedValue({
      id: 100,
      amount: 5000,
      proposedBy: 'buyer',
      status: 'pending',
      createdAt: new Date(),
    })

    const result = await createInitialOffer(10, BUYER_ID, 5000)

    expect(result.id).toBe(100)
    expect(result.amount).toBe(5000)
  })
})

describe('purchaseProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws NotFoundError for missing product', async () => {
    vi.mocked(findProductById).mockResolvedValue(undefined)

    await expect(purchaseProduct(999, BUYER_ID)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for sold product', async () => {
    vi.mocked(findProductById).mockResolvedValue({ ...baseProduct, status: 'sold' as const })

    try {
      await purchaseProduct(10, BUYER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws InvalidStateError when purchasing own product', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)

    try {
      await purchaseProduct(10, SELLER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot purchase your own product')
    }
  })

  it('throws ForbiddenError when product reserved for another buyer', async () => {
    const reservedProduct = { ...baseProduct, status: 'reserved' as const, reservedBy: BUYER_ID }
    vi.mocked(findProductById).mockResolvedValue(reservedProduct)

    try {
      await purchaseProduct(10, 999)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as Error).message).toBe('Product is reserved for another buyer')
    }
  })

  it('direct purchase uses listing price', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(purchaseProductWithTransaction).mockResolvedValue({ transactionId: 1 })

    const result = await purchaseProduct(10, BUYER_ID)

    expect(result.finalPrice).toBe(10000)
    expect(result.transactionId).toBe(1)
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
    vi.mocked(purchaseProductWithTransaction).mockResolvedValue({ transactionId: 2 })

    const result = await purchaseProduct(10, BUYER_ID, 100)

    expect(result.finalPrice).toBe(7500)
    expect(result.transactionId).toBe(2)
  })

  it('reserved buyer can purchase their reserved product', async () => {
    const reservedProduct = { ...baseProduct, status: 'reserved' as const, reservedBy: BUYER_ID }
    vi.mocked(findProductById).mockResolvedValue(reservedProduct)
    vi.mocked(purchaseProductWithTransaction).mockResolvedValue({ transactionId: 3 })

    const result = await purchaseProduct(10, BUYER_ID)

    expect(result.transactionId).toBe(3)
  })

  it('throws ConflictError on version conflict', async () => {
    vi.mocked(findProductById).mockResolvedValue(baseProduct)
    vi.mocked(purchaseProductWithTransaction).mockResolvedValue(null)

    try {
      await purchaseProduct(10, BUYER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError)
      expect((err as Error).message).toBe('Product was modified by another user')
    }
  })
})
