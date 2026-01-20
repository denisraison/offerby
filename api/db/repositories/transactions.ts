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

export const findTransactionsBySeller = (sellerId: number) =>
  db
    .selectFrom('transactions')
    .innerJoin('products', 'products.id', 'transactions.product_id')
    .innerJoin('users', 'users.id', 'transactions.buyer_id')
    .where('transactions.seller_id', '=', sellerId)
    .select([
      'transactions.id',
      'transactions.product_id as productId',
      'products.name as productName',
      'users.name as buyerName',
      'transactions.final_price as finalPrice',
      'transactions.created_at as createdAt',
    ])
    .orderBy('transactions.created_at', 'desc')
    .execute()
