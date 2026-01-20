import type { Context, Next } from 'hono'

export interface ApiErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    console.error('Unhandled error:', err)

    if (err instanceof ApiError) {
      const response: ApiErrorResponse = {
        error: err.message,
      }
      if (err.code) {
        response.code = err.code
      }
      if (err.details && process.env.NODE_ENV !== 'production') {
        response.details = err.details
      }
      return c.json(response, err.statusCode as 400 | 401 | 403 | 404 | 409 | 500)
    }

    const response: ApiErrorResponse = {
      error: 'Internal server error',
    }

    if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
      response.details = {
        message: err.message,
        stack: err.stack,
      }
    }

    return c.json(response, 500)
  }
}
