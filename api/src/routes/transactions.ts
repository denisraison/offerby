import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../context.js'

const transactions = new Hono<{ Variables: AppVariables }>()
  .get('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const { transaction: transactionService } = c.get('services')
    const result = await transactionService.findBySeller(user.id)
    return c.json(result)
  })

export { transactions }
