import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { ImagesRepository } from '../../db/repositories/images.js'
import { InvalidStateError } from './errors.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, '..', '..', 'uploads')

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface UploadServiceDeps {
  images: ImagesRepository
}

export const createUploadService = ({ images }: UploadServiceDeps) => ({
  async uploadImage(file: File, uploaderId: number) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new InvalidStateError('Invalid file type. Allowed: JPEG, PNG, WebP')
    }

    if (file.size > MAX_SIZE) {
      throw new InvalidStateError('File too large. Maximum 5MB')
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const filename = `${randomUUID()}.${ext}`
    const filepath = join(UPLOADS_DIR, filename)

    await mkdir(UPLOADS_DIR, { recursive: true })

    const buffer = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(buffer))

    const result = await images.create(`/uploads/${filename}`, uploaderId)

    return { id: result.id, path: result.path }
  },
})

export type UploadService = ReturnType<typeof createUploadService>
