import { db } from '../index.js'
import type { ProductStatus } from '../types.js'

export const findAvailableProducts = () =>
  db
    .selectFrom('products')
    .innerJoin('users', 'users.id', 'products.seller_id')
    .leftJoin('product_images', (join) =>
      join
        .onRef('product_images.product_id', '=', 'products.id')
        .on('product_images.display_order', '=', 0)
    )
    .where('products.status', '!=', 'sold')
    .select([
      'products.id',
      'products.name',
      'products.price',
      'products.status',
      'product_images.path as image',
      'users.name as sellerName',
    ])
    .orderBy('products.created_at', 'desc')
    .execute()

export const findProductById = (id: number) =>
  db
    .selectFrom('products')
    .innerJoin('users', 'users.id', 'products.seller_id')
    .where('products.id', '=', id)
    .select([
      'products.id',
      'products.name',
      'products.description',
      'products.price',
      'products.status',
      'products.reserved_by as reservedBy',
      'products.version',
      'products.created_at as createdAt',
      'users.id as sellerId',
      'users.name as sellerName',
    ])
    .executeTakeFirst()

export const findProductImages = (productId: number) =>
  db
    .selectFrom('product_images')
    .where('product_id', '=', productId)
    .select(['id', 'path', 'display_order as displayOrder'])
    .orderBy('display_order', 'asc')
    .execute()

export const createProduct = (data: {
  sellerId: number
  name: string
  description?: string | null
  price: number
}) =>
  db
    .insertInto('products')
    .values({
      seller_id: data.sellerId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
    })
    .returning('id')
    .executeTakeFirstOrThrow()

export const linkImageToProduct = (
  imageId: number,
  productId: number,
  displayOrder: number
) =>
  db
    .updateTable('product_images')
    .set({ product_id: productId, display_order: displayOrder })
    .where('id', '=', imageId)
    .where('product_id', 'is', null)
    .execute()

export const updateProductStatus = async (
  id: number,
  status: ProductStatus,
  expectedVersion: number,
  reservedBy?: number | null
) => {
  const result = await db
    .updateTable('products')
    .set({
      status,
      reserved_by: reservedBy ?? null,
      version: expectedVersion + 1,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .executeTakeFirst()

  return result.numUpdatedRows > 0n
}

export const findProductsBySeller = (sellerId: number) =>
  db
    .selectFrom('products')
    .leftJoin('product_images', (join) =>
      join
        .onRef('product_images.product_id', '=', 'products.id')
        .on('product_images.display_order', '=', 0)
    )
    .where('products.seller_id', '=', sellerId)
    .select([
      'products.id',
      'products.name',
      'products.price',
      'products.status',
      'product_images.path as image',
    ])
    .orderBy('products.created_at', 'desc')
    .execute()
