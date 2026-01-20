import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import {
  findOfferById,
  counterOffer,
  updateOfferStatus,
} from '../../db/repositories/offers.js'
import { findProductById, updateProductStatus } from '../../db/repositories/products.js'

const offers = new Hono<{ Variables: { user: AuthUser } }>()

offers.post('/:id/counter', authMiddleware, async (c) => {
  const offerId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')

  const body = await c.req.json<{ amount: number }>().catch(() => ({ amount: 0 }))
  if (!body.amount || body.amount <= 0 || !Number.isInteger(body.amount)) {
    return c.json({ error: 'Amount must be a positive integer (cents)' }, 400)
  }

  const offer = await findOfferById(offerId)
  if (!offer) {
    return c.json({ error: 'Offer not found' }, 404)
  }

  if (offer.status !== 'pending') {
    return c.json({ error: 'Offer is not pending' }, 400)
  }

  if (offer.productStatus === 'sold') {
    return c.json({ error: 'Product is already sold' }, 400)
  }

  const isBuyer = user.id === offer.buyerId
  const isSeller = user.id === offer.sellerId
  if (!isBuyer && !isSeller) {
    return c.json({ error: 'Not authorised to counter this offer' }, 403)
  }

  const userRole = isBuyer ? 'buyer' : 'seller'
  if (offer.proposedBy === userRole) {
    return c.json({ error: 'Cannot counter your own offer' }, 400)
  }

  const newOffer = await counterOffer(
    offerId,
    offer.productId,
    offer.buyerId,
    body.amount,
    userRole
  )

  return c.json(newOffer, 201)
})

offers.post('/:id/accept', authMiddleware, async (c) => {
  const offerId = parseInt(c.req.param('id'), 10)
  const user = c.get('user')

  const offer = await findOfferById(offerId)
  if (!offer) {
    return c.json({ error: 'Offer not found' }, 404)
  }

  if (offer.status !== 'pending') {
    return c.json({ error: 'Offer is not pending' }, 400)
  }

  if (offer.productStatus === 'sold') {
    return c.json({ error: 'Product is already sold' }, 400)
  }

  const isBuyer = user.id === offer.buyerId
  const isSeller = user.id === offer.sellerId
  if (!isBuyer && !isSeller) {
    return c.json({ error: 'Not authorised to accept this offer' }, 403)
  }

  const userRole = isBuyer ? 'buyer' : 'seller'
  if (offer.proposedBy === userRole) {
    return c.json({ error: 'Cannot accept your own offer' }, 400)
  }

  const product = await findProductById(offer.productId)
  if (!product) {
    return c.json({ error: 'Product not found' }, 404)
  }

  await updateOfferStatus(offerId, 'accepted')
  await updateProductStatus(offer.productId, 'reserved', product.version, offer.buyerId)

  return c.json({ success: true, offerId, amount: offer.amount })
})

export { offers }
