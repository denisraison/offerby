import type { Repositories } from '../../db/repositories/index.js'
import { createAuthService, type AuthService } from './auth.js'
import { createProductService, type ProductService } from './product.js'
import { createOfferService, type OfferService } from './offer.js'
import { createUploadService, type UploadService } from './upload.js'
import { createTransactionService, type TransactionService } from './transactions.js'

export interface Services {
  auth: AuthService
  product: ProductService
  offer: OfferService
  upload: UploadService
  transaction: TransactionService
}

export const createServices = (repos: Repositories): Services => ({
  auth: createAuthService({ users: repos.users }),
  product: createProductService({ products: repos.products, offers: repos.offers }),
  offer: createOfferService({ offers: repos.offers, products: repos.products }),
  upload: createUploadService({ images: repos.images }),
  transaction: createTransactionService({ transactions: repos.transactions }),
})
