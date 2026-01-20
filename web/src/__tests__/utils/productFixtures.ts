import type { ProductDetail, Offer, ProductImage } from '@/types/api'

const baseImage: ProductImage = {
  id: 1,
  path: '/uploads/test.jpg',
  displayOrder: 0,
}

const baseProduct: ProductDetail = {
  id: 1,
  name: 'Test Product',
  description: 'A test product description',
  price: 10000,
  status: 'available',
  reservedBy: null,
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  sellerId: 100,
  sellerName: 'Test Seller',
  images: [baseImage],
  offers: [],
  canPurchase: false,
  canMakeInitialOffer: false,
}

export function createAvailableProduct(overrides?: Partial<ProductDetail>): ProductDetail {
  return {
    ...baseProduct,
    status: 'available',
    canPurchase: true,
    canMakeInitialOffer: true,
    ...overrides,
  }
}

export function createSoldProduct(overrides?: Partial<ProductDetail>): ProductDetail {
  return {
    ...baseProduct,
    status: 'sold',
    canPurchase: false,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export function createReservedProduct(buyerId: number, overrides?: Partial<ProductDetail>): ProductDetail {
  return {
    ...baseProduct,
    status: 'reserved',
    reservedBy: buyerId,
    canPurchase: true,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export function createOwnProduct(sellerId: number, overrides?: Partial<ProductDetail>): ProductDetail {
  return {
    ...baseProduct,
    sellerId,
    sellerName: 'You',
    canPurchase: false,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export function createPendingOffer(options: {
  id?: number
  buyerId: number
  buyerName: string
  amount: number
  proposedBy: 'buyer' | 'seller'
  canCounter?: boolean
  canAccept?: boolean
}): Offer {
  return {
    id: options.id ?? 1,
    buyerId: options.buyerId,
    buyerName: options.buyerName,
    amount: options.amount,
    proposedBy: options.proposedBy,
    status: 'pending',
    parentOfferId: null,
    createdAt: '2024-01-01T00:00:00Z',
    canCounter: options.canCounter ?? true,
    canAccept: options.canAccept ?? true,
  }
}

export function createAcceptedOffer(options: {
  id?: number
  buyerId: number
  buyerName: string
  amount: number
}): Offer {
  return {
    id: options.id ?? 1,
    buyerId: options.buyerId,
    buyerName: options.buyerName,
    amount: options.amount,
    proposedBy: 'seller',
    status: 'accepted',
    parentOfferId: null,
    createdAt: '2024-01-01T00:00:00Z',
    canCounter: false,
    canAccept: false,
  }
}

export function createProductWithPendingOfferFromBuyer(
  buyerId: number,
  buyerName: string,
  offerAmount: number,
  overrides?: Partial<ProductDetail>
): ProductDetail {
  const offer = createPendingOffer({
    buyerId,
    buyerName,
    amount: offerAmount,
    proposedBy: 'buyer',
    canCounter: true,
    canAccept: true,
  })

  return {
    ...baseProduct,
    status: 'available',
    offers: [offer],
    canPurchase: false,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export function createProductWithCounterFromSeller(
  buyerId: number,
  buyerName: string,
  counterAmount: number,
  overrides?: Partial<ProductDetail>
): ProductDetail {
  const offer = createPendingOffer({
    buyerId,
    buyerName,
    amount: counterAmount,
    proposedBy: 'seller',
    canCounter: true,
    canAccept: true,
  })

  return {
    ...baseProduct,
    status: 'available',
    offers: [offer],
    canPurchase: false,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export function createProductWithAcceptedOffer(
  buyerId: number,
  buyerName: string,
  acceptedAmount: number,
  overrides?: Partial<ProductDetail>
): ProductDetail {
  const offer = createAcceptedOffer({
    buyerId,
    buyerName,
    amount: acceptedAmount,
  })

  return {
    ...baseProduct,
    status: 'reserved',
    reservedBy: buyerId,
    offers: [offer],
    canPurchase: true,
    canMakeInitialOffer: false,
    ...overrides,
  }
}

export const testUsers = {
  seller: { id: 100, email: 'seller@test.com', name: 'Test Seller' },
  buyer: { id: 200, email: 'buyer@test.com', name: 'Test Buyer' },
  otherBuyer: { id: 300, email: 'other@test.com', name: 'Other Buyer' },
}
