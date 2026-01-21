import type { Kysely } from 'kysely'
import type { Database } from '../types.js'
import { VersionConflictError } from '../errors.js'

export type ProductCursor = { createdAt: Date; id: number }

export const createProductsRepository = (database: Kysely<Database>) => ({
  findAvailable: (cursor?: ProductCursor, limit = 50) =>
    database
      .selectFrom('products')
      .innerJoin('users', 'users.id', 'products.seller_id')
      .leftJoin('product_images', (join) =>
        join
          .onRef('product_images.product_id', '=', 'products.id')
          .on('product_images.display_order', '=', 0)
      )
      .where('products.status', '!=', 'sold')
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('products.created_at', '<', cursor!.createdAt),
            and([
              eb('products.created_at', '=', cursor!.createdAt),
              eb('products.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([
        'products.id',
        'products.name',
        'products.price',
        'products.status',
        'products.created_at as createdAt',
        'product_images.path as image',
        'users.name as sellerName',
      ])
      .orderBy('products.created_at', 'desc')
      .orderBy('products.id', 'desc')
      .limit(limit + 1)
      .execute(),

  findById: (id: number) =>
    database
      .selectFrom('products')
      .innerJoin('users', 'users.id', 'products.seller_id')
      .where('products.id', '=', id)
      .select([
        'products.id',
        'products.name',
        'products.description',
        'products.price',
        'products.status',
        'products.reserved_by as reservedBy',
        'products.version',
        'products.created_at as createdAt',
        'users.id as sellerId',
        'users.name as sellerName',
      ])
      .limit(1)
      .executeTakeFirst(),

  findImages: (productId: number) =>
    database
      .selectFrom('product_images')
      .where('product_id', '=', productId)
      .select(['id', 'path', 'display_order as displayOrder'])
      .orderBy('display_order', 'asc')
      .execute(),

  create: (data: { sellerId: number; name: string; description?: string | null; price: number }) =>
    database
      .insertInto('products')
      .values({
        seller_id: data.sellerId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),

  linkImage: async (imageId: number, productId: number, displayOrder: number, uploaderId: number) => {
    const result = await database
      .updateTable('product_images')
      .set({ product_id: productId, display_order: displayOrder })
      .where('id', '=', imageId)
      .where('product_id', 'is', null)
      .where('uploaded_by', '=', uploaderId)
      .returning(['id'])
      .executeTakeFirst()

    return result !== undefined
  },

  findBySeller: (sellerId: number, cursor?: ProductCursor, limit = 50) =>
    database
      .selectFrom('products')
      .leftJoin('product_images', (join) =>
        join
          .onRef('product_images.product_id', '=', 'products.id')
          .on('product_images.display_order', '=', 0)
      )
      .where('products.seller_id', '=', sellerId)
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('products.created_at', '<', cursor!.createdAt),
            and([
              eb('products.created_at', '=', cursor!.createdAt),
              eb('products.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([
        'products.id',
        'products.name',
        'products.price',
        'products.status',
        'products.created_at as createdAt',
        'product_images.path as image',
      ])
      .orderBy('products.created_at', 'desc')
      .orderBy('products.id', 'desc')
      .limit(limit + 1)
      .execute(),

  purchaseWithTransaction: async (
    productId: number,
    buyerId: number,
    sellerId: number,
    finalPrice: number,
    expectedVersion: number,
    offerId?: number
  ) => {
    return database.transaction().execute(async (trx) => {
      const updated = await trx
        .updateTable('products')
        .set({
          status: 'sold',
          reserved_by: null,
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

      const transaction = await trx
        .insertInto('transactions')
        .values({
          product_id: productId,
          buyer_id: buyerId,
          seller_id: sellerId,
          final_price: finalPrice,
          offer_id: offerId ?? null,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow()

      return { transactionId: transaction.id }
    })
  },
})

export type ProductsRepository = ReturnType<typeof createProductsRepository>
