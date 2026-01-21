import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { testDb, testServices, truncateAll, closeTestDb } from '../__tests__/setup.js'
import { createTestUser } from '../__tests__/factories.js'
import { InvalidStateError } from './errors.js'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

const uploadService = testServices.upload

function createMockFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('uploadImage', () => {
  beforeEach(() => truncateAll())
  afterAll(() => closeTestDb())

  it('throws InvalidStateError for invalid file type', async () => {
    const user = await createTestUser('Uploader', 'uploader@test.com')
    const file = createMockFile('test.txt', 'text/plain', 100)

    try {
      await uploadService.uploadImage(file, user.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('Invalid file type. Allowed: JPEG, PNG, WebP')
    }
  })

  it('throws InvalidStateError for file over 5MB', async () => {
    const user = await createTestUser('Uploader', 'uploader@test.com')
    const file = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024)

    try {
      await uploadService.uploadImage(file, user.id)
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidStateError)
      expect((err as Error).message).toBe('File too large. Maximum 5MB')
    }
  })

  it('accepts valid JPEG image', async () => {
    const user = await createTestUser('Uploader', 'uploader@test.com')
    const file = createMockFile('photo.jpg', 'image/jpeg', 1024)

    const result = await uploadService.uploadImage(file, user.id)

    expect(result.id).toBeDefined()
    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.jpg$/)

    const savedImage = await testDb
      .selectFrom('product_images')
      .where('id', '=', result.id)
      .selectAll()
      .executeTakeFirst()
    expect(savedImage).toBeDefined()
    expect(savedImage?.uploaded_by).toBe(user.id)
  })

  it('accepts valid PNG image', async () => {
    const user = await createTestUser('Uploader', 'uploader@test.com')
    const file = createMockFile('image.png', 'image/png', 1024)

    const result = await uploadService.uploadImage(file, user.id)

    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/)
  })

  it('accepts valid WebP image', async () => {
    const user = await createTestUser('Uploader', 'uploader@test.com')
    const file = createMockFile('image.webp', 'image/webp', 1024)

    const result = await uploadService.uploadImage(file, user.id)

    expect(result.path).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/)
  })
})
