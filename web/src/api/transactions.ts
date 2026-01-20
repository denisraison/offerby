import { get } from './client'
import type { Transaction } from '@/types/api'

export function getMyTransactions(): Promise<Transaction[]> {
  return get<Transaction[]>('/api/transactions')
}
