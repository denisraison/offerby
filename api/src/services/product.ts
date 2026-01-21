import type { ProductsRepository, ProductCursor } from '../../db/repositories/products.js'
import type { OffersRepository } from '../../db/repositories/offers.js'
import { DuplicateOfferError, VersionConflictError } from '../../db/errors.js'
import { extractPagination } from '../lib/pagination.js'
import { computeOfferPermissions, computeProductPermissions } from '../lib/permissions.js'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ConflictError,
  AlreadyExistsError,
} from './errors.js'

interface ProductServiceDeps {
  products: ProductsRepository
  offers: OffersRepository
}

export const createProductService = ({ products, offers }: ProductServiceDeps) => {
  return {
    async listAvailableProducts(cursor?: ProductCursor, limit = 50) {
      const results = await products.findAvailable(cursor, limit)
      return extractPagination(results, limit)
    },

    async listSellerProducts(sellerId: number, cursor?: ProductCursor, limit = 50) {
      const sellerProducts = await products.findBySeller(sellerId, cursor, limit)
      const { items, hasMore, nextCursor } = extractPagination(sellerProducts, limit)

      const productIds = items.map((p) => p.id)

      let offerCounts: Map<number, number> = new Map()
      if (productIds.length > 0) {
        const counts = await offers.countPendingByProducts(productIds)
        offerCounts = new Map(counts.map((c) => [c.productId, Number(c.count)]))
      }

      return {
        items: items.map((p) => ({
          ...p,
          offerCount: offerCounts.get(p.id) ?? 0,
        })),
        hasMore,
        nextCursor,
      }
    },

    async getProductDetails(productId: number, userId: number) {
      const [product, images, productOffers] = await Promise.all([
        products.findById(productId),
        products.findImages(productId),
        offers.findByProduct(productId),
      ])

      if (!product) {
        throw new NotFoundError('Product not found')
      }

      const pendingOfferFromUser = productOffers.find(
        (o) => o.buyerId === userId && o.status === 'pending'
      )
      const { canPurchase, canMakeInitialOffer } = computeProductPermissions(
        product,
        userId,
        !!pendingOfferFromUser
      )

      const offersWithPermissions = productOffers.map((offer) => {
        const { canCounter, canAccept } = computeOfferPermissions(offer, product, userId)
        return { ...offer, canCounter, canAccept }
      })

      return {
        ...product,
        images,
        offers: offersWithPermissions,
        canPurchase,
        canMakeInitialOffer,
      }
    },

    async createProduct(data: {
      sellerId: number
      name: string
      description?: string | null
      price: number
      imageIds?: number[]
    }) {
      const product = await products.create({
        sellerId: data.sellerId,
        name: data.name,
        description: data.description,
        price: data.price,
      })

      if (data.imageIds && data.imageIds.length > 0) {
        for (let i = 0; i < data.imageIds.length; i++) {
          const linked = await products.linkImage(data.imageIds[i], product.id, i, data.sellerId)
          if (!linked) {
            throw new InvalidStateError('Invalid image ID or not authorised to use this image')
          }
        }
      }

      return { id: product.id }
    },

    async createInitialOffer(productId: number, buyerId: number, amount: number) {
      const product = await products.findById(productId)
      if (!product) {
        throw new NotFoundError('Product not found')
      }

      if (product.status === 'sold') {
        throw new InvalidStateError('Product is already sold')
      }

      if (product.status === 'reserved') {
        throw new InvalidStateError('Product is reserved')
      }

      if (product.sellerId === buyerId) {
        throw new InvalidStateError('Cannot make an offer on your own product')
      }

      const existingOffer = await offers.findPending(productId, buyerId)
      if (existingOffer) {
        throw new AlreadyExistsError('You already have a pending offer on this product')
      }

      try {
        return await offers.create(productId, buyerId, amount)
      } catch (err) {
        if (err instanceof DuplicateOfferError) {
          throw new AlreadyExistsError('You already have a pending offer on this product')
        }
        throw err
      }
    },

    async purchaseProduct(productId: number, buyerId: number, offerId?: number) {
      const product = await products.findById(productId)
      if (!product) {
        throw new NotFoundError('Product not found')
      }

      if (product.status === 'sold') {
        throw new InvalidStateError('Product is already sold')
      }

      if (product.sellerId === buyerId) {
        throw new InvalidStateError('Cannot purchase your own product')
      }

      if (product.status === 'reserved' && product.reservedBy !== buyerId) {
        throw new ForbiddenError('Product is reserved for another buyer')
      }

      let finalPrice = product.price
      let resolvedOfferId: number | undefined

      if (offerId) {
        const productOffers = await offers.findByProduct(productId)
        const acceptedOffer = productOffers.find(
          (o) => o.id === offerId && o.status === 'accepted' && o.buyerId === buyerId
        )
        if (!acceptedOffer) {
          throw new InvalidStateError('Invalid or non-accepted offer')
        }
        finalPrice = acceptedOffer.amount
        resolvedOfferId = acceptedOffer.id
      }

      try {
        const result = await products.purchaseWithTransaction(
          productId,
          buyerId,
          product.sellerId,
          finalPrice,
          product.version,
          resolvedOfferId
        )

        return { transactionId: result.transactionId, finalPrice }
      } catch (err) {
        if (err instanceof VersionConflictError) {
          throw new ConflictError('Product was modified by another user')
        }
        throw err
      }
    },
  }
}

export type ProductService = ReturnType<typeof createProductService>
