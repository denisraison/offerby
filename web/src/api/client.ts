import { config } from '@/lib/config'
import router from '@/router'

export const API_BASE_URL = config.apiUrl

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function resolveImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return `${API_BASE_URL}${path}`
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data.error || 'Request failed'

    if (response.status === 401 && getToken()) {
      clearAuth()
      router.push('/login')
    }

    throw new ApiError(response.status, message)
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

export async function upload(file: File): Promise<{ id: number; path: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, data.error || 'Upload failed')
  }

  return res.json()
}
