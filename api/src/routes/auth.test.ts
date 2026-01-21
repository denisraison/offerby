import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { auth } from './auth.js'
import type { AppVariables } from '../context.js'
import { testServices, truncateAll, testDb } from '../__tests__/setup.js'
import bcrypt from 'bcrypt'

const TEST_SECRET = 'test-secret-for-integration'

function createTestApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('services', testServices)
    await next()
  })
  app.route('/api/auth', auth)
  return app
}

describe('POST /api/auth/login', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

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

  beforeEach(() => truncateAll())

  it('validates email is required', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('validates password is required', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns token and user on successful login', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    await testDb
      .insertInto('users')
      .values({ email: 'test@test.com', name: 'Test User', password_hash: passwordHash })
      .execute()

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBeDefined()
    expect(json.user.email).toBe('test@test.com')
  })
})

describe('POST /api/auth/logout', () => {
  const app = createTestApp()

  it('returns success', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('POST /api/auth/register', () => {
  const originalSecret = process.env.JWT_SECRET
  const app = createTestApp()

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

  beforeEach(() => truncateAll())

  it('validates email is required', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123', name: 'Test User' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('validates password is required', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', name: 'Test User' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('validates name is required', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns token and user on successful registration', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newuser@test.com', password: 'password123', name: 'New User' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBeDefined()
    expect(json.user.name).toBe('New User')
  })
})
