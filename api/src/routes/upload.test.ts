import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { upload } from './upload.js'
import type { AppVariables } from '../context.js'
import { testServices, truncateAll } from '../__tests__/setup.js'
import { createTestUser, makeToken } from '../__tests__/factories.js'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

const TEST_SECRET = 'test-secret-for-integration'

function createTestApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', async (c, next) => {
    c.set('services', testServices)
    await next()
  })
  app.route('/api/upload', upload)
  return app
}

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('POST /api/upload', () => {
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

  it('returns 401 without auth token', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('photo.jpg', 'image/jpeg', 1024))

    const res = await app.request('/api/upload', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(401)
  })

  it('returns 400 when no file provided', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)
    const formData = new FormData()

    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('No file provided')
  })

  it('uploads image and returns id and path', async () => {
    const user = await createTestUser('User', 'user@test.com')
    const token = await makeToken(user.id, user.email)

    const formData = new FormData()
    const file = createMockFile('photo.jpg', 'image/jpeg', 1024)
    formData.append('file', file)

    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.path).toMatch(/^\/uploads\/.*\.jpg$/)
  })
})
