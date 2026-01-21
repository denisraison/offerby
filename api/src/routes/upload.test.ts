import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { upload } from './upload.js'

vi.mock('../services/upload.js', () => ({
  uploadImage: vi.fn(),
}))

const { uploadImage } = await import('../services/upload.js')

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
  })

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
    const formData = new FormData()

    const token = await makeToken(USER_ID)
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
    vi.mocked(uploadImage).mockResolvedValue({ id: 1, path: '/uploads/test.jpg' })

    const formData = new FormData()
    const file = createMockFile('photo.jpg', 'image/jpeg', 1024)
    formData.append('file', file)

    const token = await makeToken(USER_ID)
    const res = await app.request('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(1)
    expect(json.path).toBe('/uploads/test.jpg')
  })
})
