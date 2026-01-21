import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadImage } from './upload.js'
import { InvalidStateError } from './errors.js'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../db/repositories/images.js', () => ({
  createImage: vi.fn(),
}))

const { createImage } = await import('../../db/repositories/images.js')

const USER_ID = 1

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('uploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createImage).mockImplementation(async (path, _uploadedBy) => ({ id: 1, path }))
  })

  it('throws InvalidStateError for invalid file type', async () => {
    const file = createMockFile('test.txt', 'text/plain', 100)

    try {
      await uploadImage(file, USER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Invalid file type. Allowed: JPEG, PNG, WebP')
    }
  })

  it('throws InvalidStateError for file over 5MB', async () => {
    const file = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024)

    try {
      await uploadImage(file, USER_ID)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('File too large. Maximum 5MB')
    }
  })

  it('accepts valid JPEG image', async () => {
    const file = createMockFile('photo.jpg', 'image/jpeg', 1024)

    const result = await uploadImage(file, USER_ID)

    expect(result.id).toBe(1)
    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/)
  })

  it('accepts valid PNG image', async () => {
    const file = createMockFile('image.png', 'image/png', 1024)

    const result = await uploadImage(file, USER_ID)

    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/)
  })

  it('accepts valid WebP image', async () => {
    const file = createMockFile('image.webp', 'image/webp', 1024)

    const result = await uploadImage(file, USER_ID)

    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/)
  })
})
