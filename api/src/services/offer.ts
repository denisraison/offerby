import {
  findOfferById,
  counterOffer as counterOfferRepo,
  findPendingOffersForSeller,
  findPendingOffersForBuyer,
  findAcceptedOffersForBuyer,
  acceptOfferWithReservation,
} from '../../db/repositories/offers.js'
import { findProductById } from '../../db/repositories/products.js'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ConflictError,
} from './errors.js'

type ProposedBy = 'buyer' | 'seller'

interface OfferContext {
  offer: Awaited<ReturnType<typeof findOfferById>>
  userRole: ProposedBy
}

function validateOfferAction(
  offer: Awaited<ReturnType<typeof findOfferById>>,
  userId: number,
  actionName: string
): OfferContext {
  if (!offer) {
    throw new NotFoundError('Offer not found')
  }

  if (offer.status !== 'pending') {
    throw new InvalidStateError('Offer is not pending')
  }

  if (offer.productStatus === 'sold') {
    throw new InvalidStateError('Product is already sold')
  }

  const isBuyer = userId === offer.buyerId
  const isSeller = userId === offer.sellerId
  if (!isBuyer && !isSeller) {
    throw new ForbiddenError(`Not authorised to ${actionName} this offer`)
  }

  const userRole = isBuyer ? 'buyer' : 'seller'
  if (offer.proposedBy === userRole) {
    throw new InvalidStateError(`Cannot ${actionName} your own offer`)
  }

  return { offer, userRole }
}

export interface OffersQuery {
  status?: string
  seller?: string
  buyer?: string
  limit: number
  offset: number
}

export async function listOffers(userId: number, query: OffersQuery) {
  const { status, seller, buyer, limit, offset } = query

  if (status === 'pending') {
    if (seller === 'me') {
      return findPendingOffersForSeller(userId, limit, offset)
    }

    if (buyer === 'me') {
      return findPendingOffersForBuyer(userId, limit, offset)
    }
  }

  if (status === 'accepted' && buyer === 'me') {
    return findAcceptedOffersForBuyer(userId, limit, offset)
  }

  throw new InvalidStateError('Invalid query parameters')
}

export async function counterOffer(offerId: number, userId: number, amount: number) {
  const offer = await findOfferById(offerId)
  const { userRole } = validateOfferAction(offer, userId, 'counter')

  return counterOfferRepo(offerId, offer!.productId, offer!.buyerId, amount, userRole)
}

export async function acceptOffer(offerId: number, userId: number) {
  const offer = await findOfferById(offerId)
  validateOfferAction(offer, userId, 'accept')

  const product = await findProductById(offer!.productId)
  if (!product) {
    throw new NotFoundError('Product not found')
  }

  try {
    await acceptOfferWithReservation(offerId, offer!.productId, offer!.buyerId, product.version)
  } catch (err) {
    if (err instanceof Error && err.message === 'Product version conflict') {
      throw new ConflictError('Product was modified by another user')
    }
    throw err
  }

  return { success: true, offerId, amount: offer!.amount }
}
