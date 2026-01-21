import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, testRepos, testServices, truncateAll, closeTestDb } from '../__tests__/setup.js'
import { createTestUser, createTestProduct } from '../__tests__/factories.js'
import { NotFoundError, InvalidStateError, ForbiddenError, AlreadyExistsError } from './errors.js'
import { VersionConflictError } from '../../db/errors.js'

const productService = testServices.product

describe('getProductDetails', () => {
  beforeEach(() => truncateAll())
  afterAll(() => closeTestDb())

  it('throws NotFoundError for missing product', async () => {
    const buyer = await createTestUser('Buyer', 'buyer@test.com')

    await expect(productService.getProductDetails(999, buyer.id)).rejects.toThrow(NotFoundError)
  })

  it('buyer sees canMakeInitialOffer=true on available product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const result = await productService.getProductDetails(product.id, buyer.id)

    expect(result.canMakeInitialOffer).toBe(true)
    expect(result.canPurchase).toBe(true)
  })

  it('buyer with pending offer sees canMakeInitialOffer=false', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testRepos.offers.create(product.id, buyer.id, 5000)

    const result = await productService.getProductDetails(product.id, buyer.id)

    expect(result.canMakeInitialOffer).toBe(false)
  })

  it('seller sees canMakeInitialOffer=false on own product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const result = await productService.getProductDetails(product.id, seller.id)

    expect(result.canMakeInitialOffer).toBe(false)
    expect(result.canPurchase).toBe(false)
  })

  it('offer shows canCounter=true for opposite party only', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testRepos.offers.create(product.id, buyer.id, 5000)

    const sellerResult = await productService.getProductDetails(product.id, seller.id)
    expect(sellerResult.offers[0].canCounter).toBe(true)
    expect(sellerResult.offers[0].canAccept).toBe(true)

    const buyerResult = await productService.getProductDetails(product.id, buyer.id)
    expect(buyerResult.offers[0].canCounter).toBe(false)
    expect(buyerResult.offers[0].canAccept).toBe(false)
  })

  it('sold product shows canPurchase=false', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'sold' })
      .where('id', '=', product.id)
      .execute()

    const result = await productService.getProductDetails(product.id, buyer.id)

    expect(result.canPurchase).toBe(false)
    expect(result.canMakeInitialOffer).toBe(false)
  })
})

describe('createInitialOffer', () => {
  beforeEach(() => truncateAll())

  it('throws NotFoundError for missing product', async () => {
    const buyer = await createTestUser('Buyer', 'buyer@test.com')

    await expect(productService.createInitialOffer(999, buyer.id, 5000)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for sold product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'sold' })
      .where('id', '=', product.id)
      .execute()

    try {
      await productService.createInitialOffer(product.id, buyer.id, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws InvalidStateError for reserved product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'reserved' })
      .where('id', '=', product.id)
      .execute()

    try {
      await productService.createInitialOffer(product.id, buyer.id, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is reserved')
    }
  })

  it('throws InvalidStateError when offering on own product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    try {
      await productService.createInitialOffer(product.id, seller.id, 5000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot make an offer on your own product')
    }
  })

  it('throws AlreadyExistsError for duplicate pending offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testRepos.offers.create(product.id, buyer.id, 5000)

    await expect(productService.createInitialOffer(product.id, buyer.id, 6000)).rejects.toThrow(AlreadyExistsError)
  })

  it('creates offer successfully', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const result = await productService.createInitialOffer(product.id, buyer.id, 5000)

    expect(result.id).toBeDefined()
    expect(result.amount).toBe(5000)
    expect(result.proposedBy).toBe('buyer')
    expect(result.status).toBe('pending')
  })
})

describe('purchaseProduct', () => {
  beforeEach(() => truncateAll())

  it('throws NotFoundError for missing product', async () => {
    const buyer = await createTestUser('Buyer', 'buyer@test.com')

    await expect(productService.purchaseProduct(999, buyer.id)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for sold product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'sold' })
      .where('id', '=', product.id)
      .execute()

    try {
      await productService.purchaseProduct(product.id, buyer.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws InvalidStateError when purchasing own product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    try {
      await productService.purchaseProduct(product.id, seller.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot purchase your own product')
    }
  })

  it('throws ForbiddenError when product reserved for another buyer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer1 = await createTestUser('Buyer1', 'buyer1@test.com')
    const buyer2 = await createTestUser('Buyer2', 'buyer2@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'reserved', reserved_by: buyer1.id })
      .where('id', '=', product.id)
      .execute()

    try {
      await productService.purchaseProduct(product.id, buyer2.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as Error).message).toBe('Product is reserved for another buyer')
    }
  })

  it('direct purchase uses listing price', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    const result = await productService.purchaseProduct(product.id, buyer.id)

    expect(result.finalPrice).toBe(10000)
    expect(result.transactionId).toBeDefined()

    const updatedProduct = await testRepos.products.findById(product.id)
    expect(updatedProduct?.status).toBe('sold')
  })

  it('purchase with accepted offer uses negotiated price', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 7500)
    await testDb
      .updateTable('counter_offers')
      .set({ status: 'accepted' })
      .where('id', '=', offer.id)
      .execute()

    const result = await productService.purchaseProduct(product.id, buyer.id, offer.id)

    expect(result.finalPrice).toBe(7500)
    expect(result.transactionId).toBeDefined()
  })

  it('reserved buyer can purchase their reserved product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    await testDb
      .updateTable('products')
      .set({ status: 'reserved', reserved_by: buyer.id })
      .where('id', '=', product.id)
      .execute()

    const result = await productService.purchaseProduct(product.id, buyer.id)

    expect(result.transactionId).toBeDefined()
    expect(result.finalPrice).toBe(10000)
  })

  it('throws ConflictError on version conflict', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)

    // Simulate race condition by directly calling repo with wrong version
    try {
      await testRepos.products.purchaseWithTransaction(
        product.id,
        buyer.id,
        seller.id,
        10000,
        999
      )
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(VersionConflictError)
    }
  })
})
