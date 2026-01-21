interface Offer {
  buyerId: number
  status: string
  proposedBy: 'buyer' | 'seller' | null
}

interface Product {
  sellerId: number
  status: string
  reservedBy: number | null
}

export interface OfferPermissions {
  canCounter: boolean
  canAccept: boolean
}

export interface ProductPermissions {
  canPurchase: boolean
  canMakeInitialOffer: boolean
}

export function computeOfferPermissions(
  offer: Offer,
  product: Product,
  userId: number
): OfferPermissions {
  const userRole = userId === offer.buyerId ? 'buyer' : userId === product.sellerId ? 'seller' : null
  const isNotSold = product.status !== 'sold'

  const canCounter =
    offer.status === 'pending' && userRole !== null && offer.proposedBy !== userRole && isNotSold

  const canAccept =
    offer.status === 'pending' && userRole !== null && offer.proposedBy !== userRole && isNotSold

  return { canCounter, canAccept }
}

export function computeProductPermissions(
  product: Product,
  userId: number,
  hasPendingOffer: boolean
): ProductPermissions {
  const isSeller = userId === product.sellerId
  const isNotSold = product.status !== 'sold'
  const isAvailable = product.status === 'available'
  const isReserved = product.status === 'reserved'

  const canPurchase =
    isNotSold && !isSeller && (isAvailable || (isReserved && product.reservedBy === userId))

  const canMakeInitialOffer = isAvailable && !isSeller && !hasPendingOffer

  return { canPurchase, canMakeInitialOffer }
}
