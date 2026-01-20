import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import { findTransactionsBySeller } from '../../db/repositories/transactions.js'

const transactions = new Hono<{ Variables: { user: AuthUser } }>()

transactions.get('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const rows = await findTransactionsBySeller(user.id)
  return c.json(rows)
})

export { transactions }
