import type { Kysely } from 'kysely'
import type { Database } from '../types.js'

export const createTransactionsRepository = (database: Kysely<Database>) => ({
  findBySeller: (sellerId: number) =>
    database
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
      .execute(),
})

export type TransactionsRepository = ReturnType<typeof createTransactionsRepository>
