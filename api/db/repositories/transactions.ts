import { db } from '../index.js'

export const createTransaction = (
  productId: number,
  buyerId: number,
  sellerId: number,
  finalPrice: number,
  offerId?: number
) =>
  db
    .insertInto('transactions')
    .values({
      product_id: productId,
      buyer_id: buyerId,
      seller_id: sellerId,
      final_price: finalPrice,
      offer_id: offerId ?? null,
    })
    .returning(['id', 'created_at as createdAt'])
    .executeTakeFirstOrThrow()
