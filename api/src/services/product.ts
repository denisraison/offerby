import {
  findAvailableProducts,
  findProductById,
  findProductImages,
  createProduct as createProductRepo,
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
import { computeOfferPermissions, computeProductPermissions } from '../lib/permissions.js'
import {
  NotFoundError,
  ForbiddenError,
  InvalidStateError,
  ConflictError,
  AlreadyExistsError,
} from './errors.js'

export async function listAvailableProducts(limit: number, offset: number) {
  return findAvailableProducts(limit, offset)
}

export async function listSellerProducts(sellerId: number, limit: number, offset: number) {
  const sellerProducts = await findProductsBySeller(sellerId, limit, offset)
  const productIds = sellerProducts.map((p) => p.id)

  let offerCounts: Map<number, number> = new Map()
  if (productIds.length > 0) {
    const counts = await countPendingOffersByProducts(productIds)
    offerCounts = new Map(counts.map((c) => [c.productId, Number(c.count)]))
  }

  return sellerProducts.map((p) => ({
    ...p,
    offerCount: offerCounts.get(p.id) ?? 0,
  }))
}

export async function getProductDetails(productId: number, userId: number) {
  const [product, images, offers] = await Promise.all([
    findProductById(productId),
    findProductImages(productId),
    findProductOffers(productId),
  ])

  if (!product) {
    throw new NotFoundError('Product not found')
  }

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

  return {
    ...product,
    images,
    offers: offersWithPermissions,
    canPurchase,
    canMakeInitialOffer,
  }
}

export async function createProduct(data: {
  sellerId: number
  name: string
  description?: string | null
  price: number
  imageIds?: number[]
}) {
  const product = await createProductRepo({
    sellerId: data.sellerId,
    name: data.name,
    description: data.description,
    price: data.price,
  })

  if (data.imageIds && data.imageIds.length > 0) {
    for (let i = 0; i < data.imageIds.length; i++) {
      const result = await linkImageToProduct(data.imageIds[i], product.id, i, data.sellerId)
      if (!result || result.numUpdatedRows === 0n) {
        throw new InvalidStateError('Invalid image ID or not authorised to use this image')
      }
    }
  }

  return { id: product.id }
}

export async function createInitialOffer(productId: number, buyerId: number, amount: number) {
  const product = await findProductById(productId)
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

  const existingOffer = await findPendingOffer(productId, buyerId)
  if (existingOffer) {
    throw new AlreadyExistsError('You already have a pending offer on this product')
  }

  try {
    return await createOffer(productId, buyerId, amount)
  } catch (err) {
    if (err instanceof Error && err.message.includes('idx_one_pending_per_buyer')) {
      throw new AlreadyExistsError('You already have a pending offer on this product')
    }
    throw err
  }
}

export async function purchaseProduct(
  productId: number,
  buyerId: number,
  offerId?: number
) {
  const product = await findProductById(productId)
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
    const offers = await findProductOffers(productId)
    const acceptedOffer = offers.find(
      (o) => o.id === offerId && o.status === 'accepted' && o.buyerId === buyerId
    )
    if (!acceptedOffer) {
      throw new InvalidStateError('Invalid or non-accepted offer')
    }
    finalPrice = acceptedOffer.amount
    resolvedOfferId = acceptedOffer.id
  }

  const result = await purchaseProductWithTransaction(
    productId,
    buyerId,
    product.sellerId,
    finalPrice,
    product.version,
    resolvedOfferId
  )

  if (!result) {
    throw new ConflictError('Product was modified by another user')
  }

  return { transactionId: result.transactionId, finalPrice }
}
