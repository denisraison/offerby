import { api } from './client'
import type { Transaction } from '@/types/api'

export function getMyTransactions(): Promise<Transaction[]> {
  return api.get<Transaction[]>('/transactions')
}
