import type { Context, Next } from 'hono'
import { verify } from 'hono/jwt'

export type { AuthUser } from '../context.js'

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'Authorization header required' }, 401)
  }

  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Invalid authorization scheme' }, 401)
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    return c.json({ error: 'Server configuration error' }, 500)
  }

  try {
    const payload = await verify(token, secret, 'HS256')
    c.set('user', {
      id: payload.sub as number,
      email: payload.email as string,
    })
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}
