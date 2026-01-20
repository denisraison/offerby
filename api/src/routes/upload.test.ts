import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { upload } from './upload.js'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db/repositories/images.js', () => ({
  createImage: vi.fn(),
}))

const { createImage } = await import('../../db/repositories/images.js')

const TEST_SECRET = 'test-secret-key'
const USER_ID = 1

const makeToken = (userId: number) =>
  sign({ sub: userId, email: `user${userId}@test.com` }, TEST_SECRET, 'HS256')

const app = new Hono()
app.route('/api/upload', upload)

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('POST /api/upload', () => {
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
    vi.mocked(createImage).mockImplementation(async (path, _uploadedBy) => ({ id: 1, path }))
  })

  it('rejects invalid file type', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('test.txt', 'text/plain', 100))

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid file type. Allowed: JPEG, PNG, WebP')
  })

  it('rejects file over 5MB', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024))

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('File too large. Maximum 5MB')
  })

  it('accepts valid image and returns id/path', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('photo.jpg', 'image/jpeg', 1024))

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(1)
    expect(json.path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/)
    expect(createImage).toHaveBeenCalledWith(expect.stringMatching(/^\/uploads\//), USER_ID)
  })
})
