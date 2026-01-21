import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import { zValidator } from '../lib/validation.js'
import {
  idParamSchema,
  createProductSchema,
  amountSchema,
  purchaseSchema,
  productsQuerySchema,
} from '../schemas/index.js'
import * as productService from '../services/product.js'

const products = new Hono<{ Variables: { user: AuthUser } }>()
  .get('/', authMiddleware, zValidator('query', productsQuerySchema), async (c) => {
    const { seller, limit, offset } = c.req.valid('query')

    if (seller === 'me') {
      const user = c.get('user')
      const result = await productService.listSellerProducts(user.id, limit, offset)
      return c.json(result)
    }

    const result = await productService.listAvailableProducts(limit, offset)
    return c.json(result)
  })
  .get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param')
    const user = c.get('user')
    const result = await productService.getProductDetails(id, user.id)
    return c.json(result)
  })
  .post('/', authMiddleware, zValidator('json', createProductSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
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
    const result = await productService.createInitialOffer(id, user.id, amount)
    return c.json(result, 201)
  })
  .post('/:id/purchase', authMiddleware, zValidator('param', idParamSchema), zValidator('json', purchaseSchema), async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const user = c.get('user')
    const result = await productService.purchaseProduct(id, user.id, body.offerId)
    return c.json(result)
  })

export { products }
