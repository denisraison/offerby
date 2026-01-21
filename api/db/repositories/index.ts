import type { Kysely } from 'kysely'
import type { Database } from '../types.js'
import { db } from '../index.js'

import { createUsersRepository, type UsersRepository } from './users.js'
import { createProductsRepository, type ProductsRepository } from './products.js'
import { createOffersRepository, type OffersRepository } from './offers.js'
import { createImagesRepository, type ImagesRepository } from './images.js'
import { createTransactionsRepository, type TransactionsRepository } from './transactions.js'


export interface Repositories {
  users: UsersRepository
  products: ProductsRepository
  offers: OffersRepository
  images: ImagesRepository
  transactions: TransactionsRepository
}

export const createRepositories = (database: Kysely<Database>): Repositories => ({
  users: createUsersRepository(database),
  products: createProductsRepository(database),
  offers: createOffersRepository(database),
  images: createImagesRepository(database),
  transactions: createTransactionsRepository(database),
})

// Default instance using the production database
export const repositories = createRepositories(db)
