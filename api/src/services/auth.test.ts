import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcrypt'
import { testDb, testRepos, testServices, truncateAll, closeTestDb } from '../__tests__/setup.js'
import { UnauthorisedError, AlreadyExistsError } from './errors.js'

const TEST_SECRET = 'test-secret-key-for-testing-purposes'
const authService = testServices.auth

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
    return closeTestDb()
  })

  beforeEach(() => truncateAll())

  it('throws UnauthorisedError for non-existent user', async () => {
    try {
      await authService.login('nonexistent@test.com', 'password123')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorisedError)
      expect((err as Error).message).toBe('Invalid credentials')
    }
  })

  it('throws UnauthorisedError for invalid password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 10)
    await testDb
      .insertInto('users')
      .values({ email: 'test@test.com', name: 'Test User', password_hash: passwordHash })
      .execute()

    try {
      await authService.login('test@test.com', 'wrongpassword')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorisedError)
      expect((err as Error).message).toBe('Invalid credentials')
    }
  })

  it('returns token and user on successful login', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    await testDb
      .insertInto('users')
      .values({ email: 'test@test.com', name: 'Test User', password_hash: passwordHash })
      .execute()

    const result = await authService.login('test@test.com', 'password123')

    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('test@test.com')
    expect(result.user.name).toBe('Test User')
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

  beforeEach(() => truncateAll())

  it('throws AlreadyExistsError when email already exists', async () => {
    await testDb
      .insertInto('users')
      .values({ email: 'existing@test.com', name: 'Existing', password_hash: 'hash' })
      .execute()

    try {
      await authService.register('existing@test.com', 'password123', 'Test User')
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(AlreadyExistsError)
      expect((err as Error).message).toBe('Email already exists')
    }
  })

  it('returns token and user on successful registration', async () => {
    const result = await authService.register('newuser@test.com', 'password123', 'New User')

    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('newuser@test.com')
    expect(result.user.name).toBe('New User')

    const savedUser = await testRepos.users.findByEmail('newuser@test.com')
    expect(savedUser).toBeDefined()
    const passwordValid = await bcrypt.compare('password123', savedUser!.password_hash)
    expect(passwordValid).toBe(true)
  })
})
