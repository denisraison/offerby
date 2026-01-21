import type { Kysely } from 'kysely'
import type { Database, ProposedBy } from '../types.js'
import { DuplicateOfferError, VersionConflictError } from '../errors.js'

export type OfferCursor = { createdAt: Date; id: number }

const offerDetailColumns = [
  'counter_offers.id',
  'counter_offers.product_id as productId',
  'counter_offers.buyer_id as buyerId',
  'counter_offers.amount',
  'counter_offers.proposed_by as proposedBy',
  'counter_offers.status',
  'counter_offers.parent_offer_id as parentOfferId',
  'counter_offers.created_at as createdAt',
] as const

const offerWithProductColumns = [
  'counter_offers.id',
  'counter_offers.product_id as productId',
  'counter_offers.buyer_id as buyerId',
  'counter_offers.amount',
  'counter_offers.created_at as createdAt',
  'products.name as productName',
  'products.price as productPrice',
] as const

export const createOffersRepository = (database: Kysely<Database>) => ({
  create: async (productId: number, buyerId: number, amount: number) => {
    try {
      return await database
        .insertInto('counter_offers')
        .values({
          product_id: productId,
          buyer_id: buyerId,
          amount,
          proposed_by: 'buyer',
        })
        .returning(['id', 'amount', 'proposed_by as proposedBy', 'status', 'created_at as createdAt'])
        .executeTakeFirstOrThrow()
    } catch (err) {
      if (err instanceof Error && err.message.includes('idx_one_pending_per_buyer')) {
        throw new DuplicateOfferError(productId, buyerId)
      }
      throw err
    }
  },

  findById: (id: number) =>
    database
      .selectFrom('counter_offers')
      .innerJoin('products', 'products.id', 'counter_offers.product_id')
      .innerJoin('users as seller', 'seller.id', 'products.seller_id')
      .innerJoin('users as buyer', 'buyer.id', 'counter_offers.buyer_id')
      .where('counter_offers.id', '=', id)
      .select([
        ...offerDetailColumns,
        'products.seller_id as sellerId',
        'products.status as productStatus',
        'products.price as listingPrice',
        'seller.name as sellerName',
        'buyer.name as buyerName',
      ])
      .limit(1)
      .executeTakeFirst(),

  findPending: (productId: number, buyerId: number) =>
    database
      .selectFrom('counter_offers')
      .where('product_id', '=', productId)
      .where('buyer_id', '=', buyerId)
      .where('status', '=', 'pending')
      .select(['id'])
      .limit(1)
      .executeTakeFirst(),

  findByProduct: (productId: number) =>
    database
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
      .execute(),

  counter: async (
    parentId: number,
    productId: number,
    buyerId: number,
    amount: number,
    proposedBy: ProposedBy
  ) => {
    return database.transaction().execute(async (trx) => {
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
  },

  countPendingByProducts: (productIds: number[]) =>
    database
      .selectFrom('counter_offers')
      .where('product_id', 'in', productIds)
      .where('status', '=', 'pending')
      .where('proposed_by', '=', 'buyer')
      .select(['product_id as productId'])
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .groupBy('product_id')
      .execute(),

  findPendingForSeller: (sellerId: number, cursor?: OfferCursor, limit = 50) =>
    database
      .selectFrom('counter_offers')
      .innerJoin('products', 'products.id', 'counter_offers.product_id')
      .innerJoin('users', 'users.id', 'counter_offers.buyer_id')
      .where('products.seller_id', '=', sellerId)
      .where('counter_offers.status', '=', 'pending')
      .where('counter_offers.proposed_by', '=', 'buyer')
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('counter_offers.created_at', '<', cursor!.createdAt),
            and([
              eb('counter_offers.created_at', '=', cursor!.createdAt),
              eb('counter_offers.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([...offerWithProductColumns, 'users.name as buyerName'])
      .orderBy('counter_offers.created_at', 'desc')
      .orderBy('counter_offers.id', 'desc')
      .limit(limit + 1)
      .execute(),

  findPendingForBuyer: (buyerId: number, cursor?: OfferCursor, limit = 50) =>
    database
      .selectFrom('counter_offers')
      .innerJoin('products', 'products.id', 'counter_offers.product_id')
      .innerJoin('users as seller', 'seller.id', 'products.seller_id')
      .where('counter_offers.buyer_id', '=', buyerId)
      .where('counter_offers.status', '=', 'pending')
      .where('counter_offers.proposed_by', '=', 'seller')
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('counter_offers.created_at', '<', cursor!.createdAt),
            and([
              eb('counter_offers.created_at', '=', cursor!.createdAt),
              eb('counter_offers.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([...offerWithProductColumns, 'seller.name as sellerName'])
      .orderBy('counter_offers.created_at', 'desc')
      .orderBy('counter_offers.id', 'desc')
      .limit(limit + 1)
      .execute(),

  findAcceptedForBuyer: (buyerId: number, cursor?: OfferCursor, limit = 50) =>
    database
      .selectFrom('counter_offers')
      .innerJoin('products', 'products.id', 'counter_offers.product_id')
      .innerJoin('users as seller', 'seller.id', 'products.seller_id')
      .where('counter_offers.buyer_id', '=', buyerId)
      .where('counter_offers.status', '=', 'accepted')
      .where('products.status', '=', 'reserved')
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('counter_offers.created_at', '<', cursor!.createdAt),
            and([
              eb('counter_offers.created_at', '=', cursor!.createdAt),
              eb('counter_offers.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([
        'counter_offers.id',
        'counter_offers.product_id as productId',
        'counter_offers.amount',
        'counter_offers.created_at as createdAt',
        'products.name as productName',
        'seller.name as sellerName',
      ])
      .orderBy('counter_offers.created_at', 'desc')
      .orderBy('counter_offers.id', 'desc')
      .limit(limit + 1)
      .execute(),

  acceptWithReservation: async (
    offerId: number,
    productId: number,
    buyerId: number,
    expectedVersion: number
  ) => {
    return database.transaction().execute(async (trx) => {
      await trx
        .updateTable('counter_offers')
        .set({ status: 'accepted' })
        .where('id', '=', offerId)
        .execute()

      const updated = await trx
        .updateTable('products')
        .set({
          status: 'reserved',
          reserved_by: buyerId,
          version: expectedVersion + 1,
          updated_at: new Date(),
        })
        .where('id', '=', productId)
        .where('version', '=', expectedVersion)
        .returning(['id'])
        .executeTakeFirst()

      if (!updated) {
        throw new VersionConflictError('product', productId)
      }

      return true
    })
  },
})

export type OffersRepository = ReturnType<typeof createOffersRepository>
