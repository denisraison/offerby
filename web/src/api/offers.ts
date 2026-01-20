import { api } from '@/lib/api'
import type {
  CreateOfferResponse,
  AcceptOfferResponse,
  PurchaseResponse,
} from '@/types/api'

export const createOffer = (productId: number, amount: number) =>
  api.post<CreateOfferResponse>(`/products/${productId}/offers`, { amount })

export const counterOffer = (offerId: number, amount: number) =>
  api.post<CreateOfferResponse>(`/offers/${offerId}/counter`, { amount })

export const acceptOffer = (offerId: number) =>
  api.post<AcceptOfferResponse>(`/offers/${offerId}/accept`)

export const purchaseProduct = (productId: number, offerId?: number) =>
  api.post<PurchaseResponse>(`/products/${productId}/purchase`, { offerId })
