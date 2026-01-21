import type { OffersRepository } from '../../db/repositories/offers.js'
import type { ProductsRepository } from '../../db/repositories/products.js'
import type { OfferCursor } from '../../db/repositories/offers.js'
import { VersionConflictError } from '../../db/errors.js'
import { extractPagination } from '../lib/pagination.js'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ConflictError,
} from './errors.js'

type ProposedBy = 'buyer' | 'seller'

interface OfferServiceDeps {
  offers: OffersRepository
  products: ProductsRepository
}

interface OffersQuery {
  status?: string
  seller?: string
  buyer?: string
  cursor?: OfferCursor
  limit: number
}

export const createOfferService = ({ offers, products }: OfferServiceDeps) => {
  type OfferDetail = Awaited<ReturnType<typeof offers.findById>>

  interface OfferContext {
    offer: OfferDetail
    userRole: ProposedBy
  }

  function validateOfferAction(
    offer: OfferDetail,
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

  return {
    async listOffers(userId: number, query: OffersQuery) {
      const { status, seller, buyer, cursor, limit } = query

      if (status === 'pending') {
        if (seller === 'me') {
          const results = await offers.findPendingForSeller(userId, cursor, limit)
          return extractPagination(results, limit)
        }

        if (buyer === 'me') {
          const results = await offers.findPendingForBuyer(userId, cursor, limit)
          return extractPagination(results, limit)
        }
      }

      if (status === 'accepted' && buyer === 'me') {
        const results = await offers.findAcceptedForBuyer(userId, cursor, limit)
        return extractPagination(results, limit)
      }

      throw new InvalidStateError('Invalid query parameters')
    },

    async counterOffer(offerId: number, userId: number, amount: number) {
      const offer = await offers.findById(offerId)
      const { userRole } = validateOfferAction(offer, userId, 'counter')

      return offers.counter(offerId, offer!.productId, offer!.buyerId, amount, userRole)
    },

    async acceptOffer(offerId: number, userId: number) {
      const offer = await offers.findById(offerId)
      validateOfferAction(offer, userId, 'accept')

      const product = await products.findById(offer!.productId)
      if (!product) {
        throw new NotFoundError('Product not found')
      }

      try {
        await offers.acceptWithReservation(offerId, offer!.productId, offer!.buyerId, product.version)
      } catch (err) {
        if (err instanceof VersionConflictError) {
          throw new ConflictError('Product was modified by another user')
        }
        throw err
      }

      return { success: true, offerId, amount: offer!.amount }
    },
  }
}

export type OfferService = ReturnType<typeof createOfferService>
