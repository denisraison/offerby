import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { Hono } from 'hono'
import bcrypt from 'bcrypt'
import { auth } from './auth.js'

vi.mock('../../db/repositories/users.js', () => ({
  findUserByEmail: vi.fn(),
  findUserIdByEmail: vi.fn(),
  createUser: vi.fn(),
}))

const { findUserByEmail, findUserIdByEmail, createUser } = await import('../../db/repositories/users.js')

const app = new Hono()
app.route('/api/auth', auth)

const TEST_SECRET = 'test-secret-key-for-testing-purposes'

describe('POST /api/auth/login', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when email is missing', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Email and password are required')
  })

  it('returns 400 when password is missing', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Email and password are required')
  })

  it('returns 401 for non-existent user', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(undefined)

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid credentials')
  })

  it('returns 401 for invalid password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 10)
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      password_hash: passwordHash,
    })

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrongpassword' }),
    })

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid credentials')
  })

  it('returns 200 with token and user on successful login', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      password_hash: passwordHash,
    })

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBeDefined()
    expect(json.user).toEqual({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
    })
  })
})

describe('POST /api/auth/logout', () => {
  it('returns 200 with success', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('POST /api/auth/register', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when email is missing', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123', name: 'Test User' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Email is required')
  })

  it('returns 400 when password is missing', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', name: 'Test User' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Password is required')
  })

  it('returns 400 when name is missing', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Name is required')
  })

  it('returns 400 when email already exists', async () => {
    vi.mocked(findUserIdByEmail).mockResolvedValue({ id: 1 })

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@test.com', password: 'password123', name: 'Test User' }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Email already exists')
  })

  it('returns 200 with token and user on successful registration', async () => {
    vi.mocked(findUserIdByEmail).mockResolvedValue(undefined)
    vi.mocked(createUser).mockResolvedValue({
      id: 1,
      email: 'newuser@test.com',
      name: 'New User',
    })

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newuser@test.com', password: 'password123', name: 'New User' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBeDefined()
    expect(json.user).toEqual({
      id: 1,
      email: 'newuser@test.com',
      name: 'New User',
    })
  })
})
