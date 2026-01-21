import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testDb, testRepos, testServices, truncateAll, closeTestDb } from '../__tests__/setup.js'
import { createTestUser, createTestProduct } from '../__tests__/factories.js'
import { InvalidStateError, ForbiddenError, NotFoundError } from './errors.js'
import { VersionConflictError } from '../../db/errors.js'

const offerService = testServices.offer

describe('counterOffer', () => {
  beforeEach(() => truncateAll())
  afterAll(() => closeTestDb())

  it('seller can counter buyer offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    const result = await offerService.counterOffer(offer.id, seller.id, 6000)

    expect(result.amount).toBe(6000)
    expect(result.proposedBy).toBe('seller')
  })

  it('buyer cannot counter own offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    try {
      await offerService.counterOffer(offer.id, buyer.id, 5500)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot counter your own offer')
    }
  })

  it('buyer can counter seller counter', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const initialOffer = await testRepos.offers.create(product.id, buyer.id, 5000)
    await testRepos.offers.counter(initialOffer.id, product.id, buyer.id, 7000, 'seller')
    const sellerCounter = await testDb
      .selectFrom('counter_offers')
      .where('parent_offer_id', '=', initialOffer.id)
      .selectAll()
      .executeTakeFirstOrThrow()

    const result = await offerService.counterOffer(sellerCounter.id, buyer.id, 5500)

    expect(result.amount).toBe(5500)
    expect(result.proposedBy).toBe('buyer')
  })

  it('seller cannot counter own counter', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const initialOffer = await testRepos.offers.create(product.id, buyer.id, 5000)
    await testRepos.offers.counter(initialOffer.id, product.id, buyer.id, 7000, 'seller')
    const sellerCounter = await testDb
      .selectFrom('counter_offers')
      .where('parent_offer_id', '=', initialOffer.id)
      .selectAll()
      .executeTakeFirstOrThrow()

    try {
      await offerService.counterOffer(sellerCounter.id, seller.id, 6500)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot counter your own offer')
    }
  })

  it('throws NotFoundError for missing offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')

    await expect(offerService.counterOffer(999, seller.id, 6000)).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidStateError for non-pending offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)
    await testDb
      .updateTable('counter_offers')
      .set({ status: 'accepted' })
      .where('id', '=', offer.id)
      .execute()

    try {
      await offerService.counterOffer(offer.id, seller.id, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Offer is not pending')
    }
  })

  it('throws InvalidStateError for sold product', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)
    await testDb
      .updateTable('products')
      .set({ status: 'sold' })
      .where('id', '=', product.id)
      .execute()

    try {
      await offerService.counterOffer(offer.id, seller.id, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Product is already sold')
    }
  })

  it('throws ForbiddenError for unrelated user', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const stranger = await createTestUser('Stranger', 'stranger@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    try {
      await offerService.counterOffer(offer.id, stranger.id, 6000)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError)
      expect((err as Error).message).toBe('Not authorised to counter this offer')
    }
  })
})

describe('acceptOffer', () => {
  beforeEach(() => truncateAll())

  it('seller can accept buyer offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    const result = await offerService.acceptOffer(offer.id, seller.id)

    expect(result.success).toBe(true)
    expect(result.offerId).toBe(offer.id)
    expect(result.amount).toBe(5000)

    const updatedProduct = await testRepos.products.findById(product.id)
    expect(updatedProduct?.status).toBe('reserved')
    expect(updatedProduct?.reservedBy).toBe(buyer.id)
  })

  it('buyer cannot accept own offer', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    try {
      await offerService.acceptOffer(offer.id, buyer.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Cannot accept your own offer')
    }
  })

  it('buyer can accept seller counter', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const initialOffer = await testRepos.offers.create(product.id, buyer.id, 5000)
    await testRepos.offers.counter(initialOffer.id, product.id, buyer.id, 7000, 'seller')
    const sellerCounter = await testDb
      .selectFrom('counter_offers')
      .where('parent_offer_id', '=', initialOffer.id)
      .selectAll()
      .executeTakeFirstOrThrow()

    const result = await offerService.acceptOffer(sellerCounter.id, buyer.id)

    expect(result.success).toBe(true)
    expect(result.amount).toBe(7000)
  })

  it('throws ConflictError on version conflict', async () => {
    const seller = await createTestUser('Seller', 'seller@test.com')
    const buyer = await createTestUser('Buyer', 'buyer@test.com')
    const product = await createTestProduct(seller.id, 'Widget', 10000)
    const offer = await testRepos.offers.create(product.id, buyer.id, 5000)

    // Simulate race condition by directly calling repo with wrong version
    try {
      await testRepos.offers.acceptWithReservation(offer.id, product.id, buyer.id, 999)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(VersionConflictError)
    }
  })
})
