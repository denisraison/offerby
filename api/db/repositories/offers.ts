import { db } from '../index.js'
import type { ProposedBy } from '../types.js'

export const createOffer = (productId: number, buyerId: number, amount: number) =>
  db
    .insertInto('counter_offers')
    .values({
      product_id: productId,
      buyer_id: buyerId,
      amount,
      proposed_by: 'buyer',
    })
    .returning(['id', 'amount', 'proposed_by as proposedBy', 'status', 'created_at as createdAt'])
    .executeTakeFirstOrThrow()

export const findOfferById = (id: number) =>
  db
    .selectFrom('counter_offers')
    .innerJoin('products', 'products.id', 'counter_offers.product_id')
    .innerJoin('users as seller', 'seller.id', 'products.seller_id')
    .innerJoin('users as buyer', 'buyer.id', 'counter_offers.buyer_id')
    .where('counter_offers.id', '=', id)
    .select([
      'counter_offers.id',
      'counter_offers.product_id as productId',
      'counter_offers.buyer_id as buyerId',
      'counter_offers.amount',
      'counter_offers.proposed_by as proposedBy',
      'counter_offers.status',
      'counter_offers.parent_offer_id as parentOfferId',
      'counter_offers.created_at as createdAt',
      'products.seller_id as sellerId',
      'products.status as productStatus',
      'products.price as listingPrice',
      'seller.name as sellerName',
      'buyer.name as buyerName',
    ])
    .executeTakeFirst()

export const findPendingOffer = (productId: number, buyerId: number) =>
  db
    .selectFrom('counter_offers')
    .where('product_id', '=', productId)
    .where('buyer_id', '=', buyerId)
    .where('status', '=', 'pending')
    .select(['id'])
    .executeTakeFirst()

export const findProductOffers = (productId: number) =>
  db
    .selectFrom('counter_offers')
    .innerJoin('users', 'users.id', 'counter_offers.buyer_id')
    .where('counter_offers.product_id', '=', productId)
    .select([
      'counter_offers.id',
      'counter_offers.buyer_id as buyerId',
      'counter_offers.amount',
      'counter_offers.proposed_by as proposedBy',
      'counter_offers.status',
      'counter_offers.parent_offer_id as parentOfferId',
      'counter_offers.created_at as createdAt',
      'users.name as buyerName',
    ])
    .orderBy('counter_offers.created_at', 'asc')
    .execute()

export const counterOffer = async (
  parentId: number,
  productId: number,
  buyerId: number,
  amount: number,
  proposedBy: ProposedBy
) => {
  return db.transaction().execute(async (trx) => {
    await trx
      .updateTable('counter_offers')
      .set({ status: 'countered' })
      .where('id', '=', parentId)
      .execute()

    return trx
      .insertInto('counter_offers')
      .values({
        product_id: productId,
        buyer_id: buyerId,
        amount,
        proposed_by: proposedBy,
        parent_offer_id: parentId,
      })
      .returning(['id', 'amount', 'proposed_by as proposedBy', 'status', 'created_at as createdAt'])
      .executeTakeFirstOrThrow()
  })
}

export const countPendingOffersByProducts = (productIds: number[]) =>
  db
    .selectFrom('counter_offers')
    .where('product_id', 'in', productIds)
    .where('status', '=', 'pending')
    .where('proposed_by', '=', 'buyer')
    .select(['product_id as productId'])
    .select((eb) => eb.fn.count<number>('id').as('count'))
    .groupBy('product_id')
    .execute()

export const findPendingOffersForSeller = (sellerId: number, limit = 50, offset = 0) =>
  db
    .selectFrom('counter_offers')
    .innerJoin('products', 'products.id', 'counter_offers.product_id')
    .innerJoin('users', 'users.id', 'counter_offers.buyer_id')
    .where('products.seller_id', '=', sellerId)
    .where('counter_offers.status', '=', 'pending')
    .where('counter_offers.proposed_by', '=', 'buyer')
    .select([
      'counter_offers.id',
      'counter_offers.product_id as productId',
      'counter_offers.buyer_id as buyerId',
      'counter_offers.amount',
      'counter_offers.created_at as createdAt',
      'products.name as productName',
      'products.price as productPrice',
      'users.name as buyerName',
    ])
    .orderBy('counter_offers.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()

export const findPendingOffersForBuyer = (buyerId: number, limit = 50, offset = 0) =>
  db
    .selectFrom('counter_offers')
    .innerJoin('products', 'products.id', 'counter_offers.product_id')
    .innerJoin('users as seller', 'seller.id', 'products.seller_id')
    .where('counter_offers.buyer_id', '=', buyerId)
    .where('counter_offers.status', '=', 'pending')
    .where('counter_offers.proposed_by', '=', 'seller')
    .select([
      'counter_offers.id',
      'counter_offers.product_id as productId',
      'counter_offers.buyer_id as buyerId',
      'counter_offers.amount',
      'counter_offers.created_at as createdAt',
      'products.name as productName',
      'products.price as productPrice',
      'seller.name as sellerName',
    ])
    .orderBy('counter_offers.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()

export const findAcceptedOffersForBuyer = (buyerId: number, limit = 50, offset = 0) =>
  db
    .selectFrom('counter_offers')
    .innerJoin('products', 'products.id', 'counter_offers.product_id')
    .innerJoin('users as seller', 'seller.id', 'products.seller_id')
    .where('counter_offers.buyer_id', '=', buyerId)
    .where('counter_offers.status', '=', 'accepted')
    .where('products.status', '=', 'reserved')
    .select([
      'counter_offers.id',
      'counter_offers.product_id as productId',
      'counter_offers.amount',
      'counter_offers.created_at as createdAt',
      'products.name as productName',
      'seller.name as sellerName',
    ])
    .orderBy('counter_offers.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()

export const acceptOfferWithReservation = async (
  offerId: number,
  productId: number,
  buyerId: number,
  expectedVersion: number
): Promise<boolean> => {
  return db.transaction().execute(async (trx) => {
    await trx
      .updateTable('counter_offers')
      .set({ status: 'accepted' })
      .where('id', '=', offerId)
      .execute()

    const result = await trx
      .updateTable('products')
      .set({
        status: 'reserved',
        reserved_by: buyerId,
        version: expectedVersion + 1,
        updated_at: new Date(),
      })
      .where('id', '=', productId)
      .where('version', '=', expectedVersion)
      .executeTakeFirst()

    if (result.numUpdatedRows === 0n) {
      throw new Error('Product version conflict')
    }

    return true
  })
}
