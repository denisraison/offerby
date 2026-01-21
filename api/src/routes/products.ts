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
import { computeOfferPermissions, computeProductPermissions } from '../lib/permissions.js'
import {
  findAvailableProducts,
  findProductById,
  findProductImages,
  createProduct,
  linkImageToProduct,
  findProductsBySeller,
  purchaseProductWithTransaction,
} from '../../db/repositories/products.js'
import {
  createOffer,
  findPendingOffer,
  findProductOffers,
  countPendingOffersByProducts,
} from '../../db/repositories/offers.js'

const products = new Hono<{ Variables: { user: AuthUser } }>()

products.get('/', authMiddleware, zValidator('query', productsQuerySchema), async (c) => {
  const { seller, limit, offset } = c.req.valid('query')

  if (seller === 'me') {
    const user = c.get('user')
    const sellerProducts = await findProductsBySeller(user.id, limit, offset)
    const productIds = sellerProducts.map((p) => p.id)

    let offerCounts: Map<number, number> = new Map()
    if (productIds.length > 0) {
      const counts = await countPendingOffersByProducts(productIds)
      offerCounts = new Map(counts.map((c) => [c.productId, Number(c.count)]))
    }

    const result = sellerProducts.map((p) => ({
      ...p,
      offerCount: offerCounts.get(p.id) ?? 0,
    }))

    return c.json(result)
  }

  const rows = await findAvailableProducts(limit, offset)
  return c.json(rows)
})

products.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')

  const product = await findProductById(id)
  if (!product) {
    return c.json({ error: 'Product not found' }, 404)
  }

  const images = await findProductImages(id)
  const offers = await findProductOffers(id)

  const user = c.get('user')
  const userId = user.id

  const pendingOfferFromUser = offers.find((o) => o.buyerId === userId && o.status === 'pending')
  const { canPurchase, canMakeInitialOffer } = computeProductPermissions(
    product,
    userId,
    !!pendingOfferFromUser
  )

  const offersWithPermissions = offers.map((offer) => {
    const { canCounter, canAccept } = computeOfferPermissions(offer, product, userId)
    return { ...offer, canCounter, canAccept }
  })

  return c.json({
    ...product,
    images,
    offers: offersWithPermissions,
    canPurchase,
    canMakeInitialOffer,
  })
})

products.post('/', authMiddleware, zValidator('json', createProductSchema), async (c) => {
  const user = c.get('user')!
  const body = c.req.valid('json')

  const product = await createProduct({
    sellerId: user.id,
    name: body.name,
    description: body.description,
    price: body.price,
  })

  if (body.imageIds && body.imageIds.length > 0) {
    for (let i = 0; i < body.imageIds.length; i++) {
      const result = await linkImageToProduct(body.imageIds[i], product.id, i, user.id)
      if (!result || result.numUpdatedRows === 0n) {
        return c.json({ error: 'Invalid image ID or not authorised to use this image' }, 400)
      }
    }
  }

  return c.json({ id: product.id }, 201)
})

products.post(
  '/:id/offers',
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', amountSchema),
  async (c) => {
    const { id: productId } = c.req.valid('param')
    const { amount } = c.req.valid('json')
    const user = c.get('user')!

    const product = await findProductById(productId)
    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    if (product.status === 'sold') {
      return c.json({ error: 'Product is already sold' }, 400)
    }

    if (product.status === 'reserved') {
      return c.json({ error: 'Product is reserved' }, 400)
    }

    if (product.sellerId === user.id) {
      return c.json({ error: 'Cannot make an offer on your own product' }, 400)
    }

    const existingOffer = await findPendingOffer(productId, user.id)
    if (existingOffer) {
      return c.json({ error: 'You already have a pending offer on this product' }, 400)
    }

    try {
      const offer = await createOffer(productId, user.id, amount)
      return c.json(offer, 201)
    } catch (err) {
      if (err instanceof Error && err.message.includes('idx_one_pending_per_buyer')) {
        return c.json({ error: 'You already have a pending offer on this product' }, 400)
      }
      throw err
    }
  }
)

products.post(
  '/:id/purchase',
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', purchaseSchema),
  async (c) => {
    const { id: productId } = c.req.valid('param')
    const body = c.req.valid('json')
    const user = c.get('user')!

    const product = await findProductById(productId)
    if (!product) {
      return c.json({ error: 'Product not found' }, 404)
    }

    if (product.status === 'sold') {
      return c.json({ error: 'Product is already sold' }, 400)
    }

    if (product.sellerId === user.id) {
      return c.json({ error: 'Cannot purchase your own product' }, 400)
    }

    if (product.status === 'reserved' && product.reservedBy !== user.id) {
      return c.json({ error: 'Product is reserved for another buyer' }, 403)
    }

    let finalPrice = product.price
    let offerId: number | undefined

    if (body.offerId) {
      const offers = await findProductOffers(productId)
      const acceptedOffer = offers.find(
        (o) => o.id === body.offerId && o.status === 'accepted' && o.buyerId === user.id
      )
      if (!acceptedOffer) {
        return c.json({ error: 'Invalid or non-accepted offer' }, 400)
      }
      finalPrice = acceptedOffer.amount
      offerId = acceptedOffer.id
    }

    const result = await purchaseProductWithTransaction(
      productId,
      user.id,
      product.sellerId,
      finalPrice,
      product.version,
      offerId
    )

    if (!result) {
      return c.json({ error: 'Product was modified by another user' }, 409)
    }

    return c.json({ transactionId: result.transactionId, finalPrice })
  }
)

export { products }
