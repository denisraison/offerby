import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { authMiddleware } from './auth.js'

const TEST_SECRET = 'test-secret-key-for-testing-purposes'

const createApp = () => {
  const app = new Hono()
  app.use('/protected/*', authMiddleware)
  app.get('/protected/resource', (c) => {
    const user = c.get('user')
    return c.json({ user })
  })
  return app
}

describe('authMiddleware', () => {
  const originalSecret = process.env.JWT_SECRET

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret
    } else {
      delete process.env.JWT_SECRET
    }
  })

  it('returns 401 when Authorization header is missing', async () => {
    const app = createApp()
    const res = await app.request('/protected/resource')

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Authorization header required')
  })

  it('returns 401 for non-Bearer scheme', async () => {
    const app = createApp()
    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Basic abc123' },
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid authorization scheme')
  })

  it('returns 401 for malformed token', async () => {
    const app = createApp()
    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid or expired token')
  })

  it('returns 401 for expired token', async () => {
    const app = createApp()
    const expiredPayload = {
      sub: 1,
      email: 'test@test.com',
      exp: Math.floor(Date.now() / 1000) - 3600,
    }
    const expiredToken = await sign(expiredPayload, TEST_SECRET)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid or expired token')
  })

  it('sets user in context for valid token', async () => {
    const app = createApp()
    const payload = {
      sub: 1,
      email: 'test@test.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const token = await sign(payload, process.env.JWT_SECRET!)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user).toEqual({
      id: 1,
      email: 'test@test.com',
    })
  })
})
