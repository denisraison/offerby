import { api } from './client'
import type { Transaction } from '@/types/api'

export function getMyTransactions(): Promise<{ items: Transaction[] }> {
  return api.get<{ items: Transaction[] }>('/transactions')
}
