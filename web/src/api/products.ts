import { api, upload as uploadFile } from './client'
import { dollarsToCents } from '@/utils/currency'
import type {
  ProductListItem,
  ProductDetail,
  CreateProductRequest,
  UploadResponse,
  SellerProductItem,
} from '@/types/api'

export function getProducts(): Promise<{ items: ProductListItem[] }> {
  return api.get<{ items: ProductListItem[] }>('/products')
}

export function getMyProducts(): Promise<{ items: SellerProductItem[] }> {
  return api.get<{ items: SellerProductItem[] }>('/products?seller=me')
}

export function getProduct(id: number): Promise<ProductDetail> {
  return api.get<ProductDetail>(`/products/${id}`)
}

export function createProduct(data: CreateProductRequest): Promise<{ id: number }> {
  return api.post<{ id: number }>('/products', { ...data, price: dollarsToCents(data.price) })
}

export function uploadImage(file: File): Promise<UploadResponse> {
  return uploadFile(file)
}
