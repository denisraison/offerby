import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import { findTransactionsBySeller } from '../../db/repositories/transactions.js'

const transactions = new Hono<{ Variables: { user: AuthUser } }>()
  .get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const result = await findTransactionsBySeller(user.id)
    return c.json(result)
  })

export { transactions }
