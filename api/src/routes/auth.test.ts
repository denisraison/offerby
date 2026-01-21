import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { auth } from './auth.js'

vi.mock('../services/auth.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))

const { login, register } = await import('../services/auth.js')

const app = new Hono()
app.route('/api/auth', auth)

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    vi.mocked(login).mockResolvedValue({
      token: 'jwt-token',
      user: { id: 1, email: 'test@test.com', name: 'Test User' },
    })

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBe('jwt-token')
    expect(json.user.id).toBe(1)
  })
})

describe('POST /api/auth/logout', () => {
  it('returns success', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    vi.mocked(register).mockResolvedValue({
      token: 'jwt-token',
      user: { id: 1, email: 'newuser@test.com', name: 'New User' },
    })

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newuser@test.com', password: 'password123', name: 'New User' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.token).toBe('jwt-token')
    expect(json.user.name).toBe('New User')
  })
})
