export type ProductStatus = 'available' | 'reserved' | 'sold'
export type OfferStatus = 'pending' | 'countered' | 'accepted'
export type ProposedBy = 'buyer' | 'seller'

export interface ProductListItem {
  id: number
  name: string
  price: number
  status: ProductStatus
  image: string | null
  sellerName: string
}

export interface ProductImage {
  id: number
  path: string
  displayOrder: number
}

export interface Offer {
  id: number
  buyerId: number
  amount: number
  proposedBy: ProposedBy
  status: OfferStatus
  parentOfferId: number | null
  createdAt: string
  buyerName: string
  canCounter: boolean
  canAccept: boolean
}

export interface ProductDetail {
  id: number
  name: string
  description: string | null
  price: number
  status: ProductStatus
  reservedBy: number | null
  version: number
  createdAt: string
  sellerId: number
  sellerName: string
  images: ProductImage[]
  offers: Offer[]
  canPurchase: boolean
  canMakeInitialOffer: boolean
}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  imageIds?: number[]
}

export interface UploadResponse {
  id: number
  path: string
}

export interface CreateOfferResponse {
  id: number
  amount: number
  proposedBy: ProposedBy
  status: OfferStatus
  createdAt: string
}

export interface AcceptOfferResponse {
  success: boolean
  offerId: number
  amount: number
}

export interface PurchaseResponse {
  transactionId: number
  finalPrice: number
}

export interface SellerProductItem {
  id: number
  name: string
  price: number
  status: ProductStatus
  image: string | null
  offerCount: number
}

export interface Transaction {
  id: number
  productId: number
  productName: string
  buyerName: string
  finalPrice: number
  createdAt: string
}

export interface PendingNegotiation {
  id: number
  productId: number
  buyerId: number
  amount: number
  productName: string
  productPrice: number
  buyerName?: string
  sellerName?: string
  createdAt: string
}

export interface AcceptedOffer {
  id: number
  productId: number
  amount: number
  productName: string
  sellerName: string
  createdAt: string
}
