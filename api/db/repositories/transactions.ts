import type { Kysely } from 'kysely'
import type { Database } from '../types.js'

export type TransactionCursor = { createdAt: Date; id: number }

export const createTransactionsRepository = (database: Kysely<Database>) => ({
  findBySeller: (sellerId: number, cursor?: TransactionCursor, limit = 50) =>
    database
      .selectFrom('transactions')
      .innerJoin('products', 'products.id', 'transactions.product_id')
      .innerJoin('users', 'users.id', 'transactions.buyer_id')
      .where('transactions.seller_id', '=', sellerId)
      .$if(cursor !== undefined, (qb) =>
        qb.where(({ eb, and, or }) =>
          or([
            eb('transactions.created_at', '<', cursor!.createdAt),
            and([
              eb('transactions.created_at', '=', cursor!.createdAt),
              eb('transactions.id', '<', cursor!.id),
            ]),
          ])
        )
      )
      .select([
        'transactions.id',
        'transactions.product_id as productId',
        'products.name as productName',
        'users.name as buyerName',
        'transactions.final_price as finalPrice',
        'transactions.created_at as createdAt',
      ])
      .orderBy('transactions.created_at', 'desc')
      .orderBy('transactions.id', 'desc')
      .limit(limit + 1)
      .execute(),
})

export type TransactionsRepository = ReturnType<typeof createTransactionsRepository>
