import type { TransactionsRepository, TransactionCursor } from '../../db/repositories/transactions.js'
import { extractPagination } from '../lib/pagination.js'

interface TransactionServiceDeps {
  transactions: TransactionsRepository
}

interface TransactionsQuery {
  cursor?: TransactionCursor
  limit: number
}

export const createTransactionService = ({ transactions }: TransactionServiceDeps) => ({
  async listBySeller(sellerId: number, query: TransactionsQuery) {
    const { cursor, limit } = query
    const results = await transactions.findBySeller(sellerId, cursor, limit)
    return extractPagination(results, limit)
  },
})

export type TransactionService = ReturnType<typeof createTransactionService>
