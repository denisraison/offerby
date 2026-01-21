import type { ColumnType, Generated } from 'kysely'

type ProductStatus = 'available' | 'reserved' | 'sold'
type OfferStatus = 'pending' | 'countered' | 'accepted'
export type ProposedBy = 'buyer' | 'seller'

export interface UsersTable {
  id: Generated<number>
  email: string
  password_hash: string
  name: string
  created_at: ColumnType<Date, never, never>
}

export interface ProductsTable {
  id: Generated<number>
  seller_id: number
  name: string
  description: string | null
  price: number
  status: ColumnType<ProductStatus, ProductStatus | undefined, ProductStatus>
  reserved_by: number | null
  version: ColumnType<number, number | undefined, number>
  created_at: ColumnType<Date, never, never>
  updated_at: ColumnType<Date, never, Date>
}

export interface ProductImagesTable {
  id: Generated<number>
  product_id: number | null
  uploaded_by: number | null
  path: string
  display_order: ColumnType<number, number | undefined, number>
  created_at: ColumnType<Date, never, never>
}

export interface CounterOffersTable {
  id: Generated<number>
  product_id: number
  buyer_id: number
  amount: number
  proposed_by: ProposedBy
  status: ColumnType<OfferStatus, OfferStatus | undefined, OfferStatus>
  parent_offer_id: number | null
  created_at: ColumnType<Date, never, never>
}

export interface TransactionsTable {
  id: Generated<number>
  product_id: number
  buyer_id: number
  seller_id: number
  final_price: number
  offer_id: number | null
  created_at: ColumnType<Date, never, never>
}

export interface Database {
  users: UsersTable
  products: ProductsTable
  product_images: ProductImagesTable
  counter_offers: CounterOffersTable
  transactions: TransactionsTable
}
