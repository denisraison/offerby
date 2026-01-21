import type { TransactionsRepository } from '../../db/repositories/transactions.js'

interface TransactionServiceDeps {
  transactions: TransactionsRepository
}

export const createTransactionService = ({ transactions }: TransactionServiceDeps) => ({
  async findBySeller(sellerId: number) {
    return transactions.findBySeller(sellerId)
  },
})

export type TransactionService = ReturnType<typeof createTransactionService>
