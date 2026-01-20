import { get, post, upload as uploadFile } from './client'
import { dollarsToCents } from '@/utils/currency'
import type {
  ProductListItem,
  ProductDetail,
  CreateProductRequest,
  UploadResponse,
} from '@/types/api'

export function getProducts(): Promise<ProductListItem[]> {
  return get<ProductListItem[]>('/api/products')
}

export function getProduct(id: number): Promise<ProductDetail> {
  return get<ProductDetail>(`/api/products/${id}`)
}

export function createProduct(data: CreateProductRequest): Promise<{ id: number }> {
  return post<{ id: number }>('/api/products', { ...data, price: dollarsToCents(data.price) })
}

export function uploadImage(file: File): Promise<UploadResponse> {
  return uploadFile(file)
}
