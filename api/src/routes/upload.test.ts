import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { upload } from './upload.js'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db/repositories/images.js', () => ({
  createImage: vi.fn(),
}))

const { createImage } = await import('../../db/repositories/images.js')

const app = new Hono()
app.route('/api/upload', upload)

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createImage).mockImplementation(async (path) => ({ id: 1, path }))
  })

  it('rejects invalid file type', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('test.txt', 'text/plain', 100))

    const res = await app.request('/api/upload', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid file type. Allowed: JPEG, PNG, WebP')
  })

  it('rejects file over 5MB', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024))

    const res = await app.request('/api/upload', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('File too large. Maximum 5MB')
  })

  it('accepts valid image and returns id/path', async () => {
    const formData = new FormData()
    formData.append('file', createMockFile('photo.jpg', 'image/jpeg', 1024))

    const res = await app.request('/api/upload', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe(1)
    expect(json.path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/)
  })
})
