import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcrypt'
import { login, register } from './auth.js'
import { UnauthorisedError, AlreadyExistsError } from './errors.js'

vi.mock('../../db/repositories/users.js', () => ({
  findUserByEmail: vi.fn(),
  findUserIdByEmail: vi.fn(),
  createUser: vi.fn(),
}))

const { findUserByEmail, findUserIdByEmail, createUser } = await import('../../db/repositories/users.js')

const TEST_SECRET = 'test-secret-key-for-testing-purposes'

describe('login', () => {
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

  it('throws UnauthorisedError for non-existent user', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(undefined)

    try {
      await login('nonexistent@test.com', 'password123')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorisedError)
      expect((err as Error).message).toBe('Invalid credentials')
    }
  })

  it('throws UnauthorisedError for invalid password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 10)
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      password_hash: passwordHash,
    })

    try {
      await login('test@test.com', 'wrongpassword')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorisedError)
      expect((err as Error).message).toBe('Invalid credentials')
    }
  })

  it('returns token and user on successful login', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
      password_hash: passwordHash,
    })

    const result = await login('test@test.com', 'password123')

    expect(result.token).toBeDefined()
    expect(result.user).toEqual({
      id: 1,
      email: 'test@test.com',
      name: 'Test User',
    })
  })
})

describe('register', () => {
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

  it('throws AlreadyExistsError when email already exists', async () => {
    vi.mocked(findUserIdByEmail).mockResolvedValue({ id: 1 })

    try {
      await register('existing@test.com', 'password123', 'Test User')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AlreadyExistsError)
      expect((err as Error).message).toBe('Email already exists')
    }
  })

  it('returns token and user on successful registration', async () => {
    vi.mocked(findUserIdByEmail).mockResolvedValue(undefined)
    vi.mocked(createUser).mockResolvedValue({
      id: 1,
      email: 'newuser@test.com',
      name: 'New User',
    })

    const result = await register('newuser@test.com', 'password123', 'New User')

    expect(result.token).toBeDefined()
    expect(result.user).toEqual({
      id: 1,
      email: 'newuser@test.com',
      name: 'New User',
    })
  })
})
