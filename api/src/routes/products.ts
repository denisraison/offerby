import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { zValidator } from '../lib/validation.js'
import {
  idParamSchema,
  createProductSchema,
  amountSchema,
  purchaseSchema,
  productsQuerySchema,
} from '../schemas/index.js'
import type { AppVariables } from '../context.js'

const products = new Hono<{ Variables: AppVariables }>()
  .get('/', authMiddleware, zValidator('query', productsQuerySchema), async (c) => {
    const { seller, status, limit, cursor } = c.req.valid('query')
    const { product: productService } = c.get('services')

    if (seller === 'me') {
      const user = c.get('user')
      const result = await productService.listSellerProducts(user.id, cursor, limit)
      return c.json(result)
    }

    const result = await productService.listAvailableProducts(cursor, limit, status)
    return c.json(result)
  })
  .get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param')
    const user = c.get('user')
    const { product: productService } = c.get('services')
    const result = await productService.getProductDetails(id, user.id)
    return c.json(result)
  })
  .post('/', authMiddleware, zValidator('json', createProductSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const { product: productService } = c.get('services')
    const result = await productService.createProduct({
      sellerId: user.id,
      name: body.name,
      description: body.description,
      price: body.price,
      imageIds: body.imageIds,
    })
    return c.json(result, 201)
  })
  .post('/:id/offers', authMiddleware, zValidator('param', idParamSchema), zValidator('json', amountSchema), async (c) => {
    const { id } = c.req.valid('param')
    const { amount } = c.req.valid('json')
    const user = c.get('user')
    const { product: productService } = c.get('services')
    const result = await productService.createInitialOffer(id, user.id, amount)
    return c.json(result, 201)
  })
  .post('/:id/purchase', authMiddleware, zValidator('param', idParamSchema), zValidator('json', purchaseSchema), async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const user = c.get('user')
    const { product: productService } = c.get('services')
    const result = await productService.purchaseProduct(id, user.id, body.offerId)
    return c.json(result)
  })

export { products }
