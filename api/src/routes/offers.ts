import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import { zValidator } from '../lib/validation.js'
import { idParamSchema, amountSchema, offersQuerySchema } from '../schemas/index.js'
import {
  findOfferById,
  counterOffer,
  findPendingOffersForSeller,
  findPendingOffersForBuyer,
  findAcceptedOffersForBuyer,
  acceptOfferWithReservation,
} from '../../db/repositories/offers.js'
import { findProductById } from '../../db/repositories/products.js'

const offers = new Hono<{ Variables: { user: AuthUser } }>()

offers.get('/', authMiddleware, zValidator('query', offersQuerySchema), async (c) => {
  const { status, seller, buyer, limit, offset } = c.req.valid('query')
  const user = c.get('user')

  if (status === 'pending') {
    if (seller === 'me') {
      const pendingOffers = await findPendingOffersForSeller(user.id, limit, offset)
      return c.json(pendingOffers)
    }

    if (buyer === 'me') {
      const pendingOffers = await findPendingOffersForBuyer(user.id, limit, offset)
      return c.json(pendingOffers)
    }
  }

  if (status === 'accepted' && buyer === 'me') {
    const acceptedOffers = await findAcceptedOffersForBuyer(user.id, limit, offset)
    return c.json(acceptedOffers)
  }

  return c.json({ error: 'Invalid query parameters' }, 400)
})

offers.post(
  '/:id/counter',
  authMiddleware,
  zValidator('param', idParamSchema),
  zValidator('json', amountSchema),
  async (c) => {
    const { id: offerId } = c.req.valid('param')
    const { amount } = c.req.valid('json')
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
      return c.json({ error: 'Not authorised to counter this offer' }, 403)
    }

    const userRole = isBuyer ? 'buyer' : 'seller'
    if (offer.proposedBy === userRole) {
      return c.json({ error: 'Cannot counter your own offer' }, 400)
    }

    const newOffer = await counterOffer(offerId, offer.productId, offer.buyerId, amount, userRole)

    return c.json(newOffer, 201)
  }
)

offers.post(
  '/:id/accept',
  authMiddleware,
  zValidator('param', idParamSchema),
  async (c) => {
    const { id: offerId } = c.req.valid('param')
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

    try {
      await acceptOfferWithReservation(offerId, offer.productId, offer.buyerId, product.version)
    } catch (err) {
      if (err instanceof Error && err.message === 'Product version conflict') {
        return c.json({ error: 'Product was modified by another user' }, 409)
      }
      throw err
    }

    return c.json({ success: true, offerId, amount: offer.amount })
  }
)

export { offers }
