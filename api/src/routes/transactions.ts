import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { zValidator } from '../lib/validation.js'
import { transactionsQuerySchema } from '../schemas/index.js'
import type { AppVariables } from '../context.js'

const transactions = new Hono<{ Variables: AppVariables }>()
  .get('/', authMiddleware, zValidator('query', transactionsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const user = c.get('user')
    const { transaction: transactionService } = c.get('services')
    const result = await transactionService.listBySeller(user.id, query)
    return c.json(result)
  })

export { transactions }
