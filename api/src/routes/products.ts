import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
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

products.get('/', authMiddleware, async (c) => {
  const seller = c.req.query('seller')
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 100)
  const offset = parseInt(c.req.query('offset') || '0', 10) || 0

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

products.get('/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10)

  const product = await findProductById(id)
  if (!product) {
    return c.json({ error: 'Product not found' }, 404)
  }

  const images = await findProductImages(id)
  const offers = await findProductOffers(id)

  const user = c.get('user')
  const userId = user.id

  const isSeller = userId === product.sellerId
  const isNotSold = product.status !== 'sold'
  const isAvailable = product.status === 'available'
  const isReserved = product.status === 'reserved'

  const pendingOfferFromUser = offers.find((o) => o.buyerId === userId && o.status === 'pending')

  const canPurchase =
    isNotSold && !isSeller && (isAvailable || (isReserved && product.reservedBy === userId))

  const canMakeInitialOffer = isAvailable && !isSeller && !pendingOfferFromUser

  const offersWithPermissions = offers.map((offer) => {
    const userRole =
      userId === offer.buyerId ? 'buyer' : userId === product.sellerId ? 'seller' : null

    const canCounter =
      offer.status === 'pending' &&
      userRole !== null &&
      offer.proposedBy !== userRole &&
      isNotSold

    const canAccept =
      offer.status === 'pending' &&
      userRole !== null &&
      offer.proposedBy !== userRole &&
      isNotSold

    return {
      ...offer,
      canCounter,
      canAccept,
    }
  })

  return c.json({
    ...product,
    images,
    offers: offersWithPermissions,
    canPurchase,
    canMakeInitialOffer,
  })
})

products.post('/', authMiddleware, async (c) => {
  const user = c.get('user')!

  const body = await c.req.json<{
    name: string
    description?: string
    price: number
    imageIds?: number[]
  }>()

  if (!body.name || body.name.length > 255) {
    return c.json({ error: 'Name is required (max 255 characters)' }, 400)
  }

  if (body.description && body.description.length > 2000) {
    return c.json({ error: 'Description too long (max 2000 characters)' }, 400)
  }

  if (!body.price || body.price <= 0 || !Number.isInteger(body.price)) {
    return c.json({ error: 'Price must be a positive integer (cents)' }, 400)
  }

  if (body.imageIds && body.imageIds.length > 5) {
    return c.json({ error: 'Maximum 5 images allowed' }, 400)
  }

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

products.post('/:id/offers', authMiddleware, async (c) => {
  const productId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')!

  const body = await c.req.json<{ amount: number }>().catch(() => ({ amount: 0 }))
  if (!body.amount || body.amount <= 0 || !Number.isInteger(body.amount)) {
    return c.json({ error: 'Amount must be a positive integer (cents)' }, 400)
  }

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
    const offer = await createOffer(productId, user.id, body.amount)
    return c.json(offer, 201)
  } catch (err) {
    if (err instanceof Error && err.message.includes('idx_one_pending_per_buyer')) {
      return c.json({ error: 'You already have a pending offer on this product' }, 400)
    }
    throw err
  }
})

products.post('/:id/purchase', authMiddleware, async (c) => {
  const productId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')!

  const body = await c.req.json<{ offerId?: number }>().catch((): { offerId?: number } => ({}))

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
})

export { products }
