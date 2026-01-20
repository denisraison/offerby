import { api } from '@/api/client'
import { dollarsToCents } from '@/utils/currency'
import type {
  CreateOfferResponse,
  AcceptOfferResponse,
  PurchaseResponse,
  PendingNegotiation,
  AcceptedOffer,
} from '@/types/api'

export const createOffer = (productId: number, amount: number) =>
  api.post<CreateOfferResponse>(`/products/${productId}/offers`, { amount: dollarsToCents(amount) })

export const counterOffer = (offerId: number, amount: number) =>
  api.post<CreateOfferResponse>(`/offers/${offerId}/counter`, { amount: dollarsToCents(amount) })

export const acceptOffer = (offerId: number) =>
  api.post<AcceptOfferResponse>(`/offers/${offerId}/accept`)

export const purchaseProduct = (productId: number, offerId?: number) =>
  api.post<PurchaseResponse>(`/products/${productId}/purchase`, { offerId })

export const getSellerPendingNegotiations = () =>
  api.get<PendingNegotiation[]>('/offers?status=pending&seller=me')

export const getBuyerPendingNegotiations = () =>
  api.get<PendingNegotiation[]>('/offers?status=pending&buyer=me')

export const getAcceptedOffers = () =>
  api.get<AcceptedOffer[]>('/offers?status=accepted&buyer=me')
