import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { zValidator } from '../lib/validation.js'
import { idParamSchema, amountSchema, offersQuerySchema } from '../schemas/index.js'
import type { AppVariables } from '../context.js'

const offers = new Hono<{ Variables: AppVariables }>()
  .get('/', authMiddleware, zValidator('query', offersQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const user = c.get('user')
    const { offer: offerService } = c.get('services')
    const result = await offerService.listOffers(user.id, query)
    return c.json(result)
  })
  .post('/:id/counter', authMiddleware, zValidator('param', idParamSchema), zValidator('json', amountSchema), async (c) => {
    const { id } = c.req.valid('param')
    const { amount } = c.req.valid('json')
    const user = c.get('user')
    const { offer: offerService } = c.get('services')
    const result = await offerService.counterOffer(id, user.id, amount)
    return c.json(result, 201)
  })
  .post('/:id/accept', authMiddleware, zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param')
    const user = c.get('user')
    const { offer: offerService } = c.get('services')
    const result = await offerService.acceptOffer(id, user.id)
    return c.json(result)
  })

export { offers }
