import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createImage } from '../../db/repositories/images.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const upload = new Hono()

upload.post('/', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 400)
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large. Maximum 5MB' }, 400)
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${randomUUID()}.${ext}`
  const filepath = join(UPLOADS_DIR, filename)

  await mkdir(UPLOADS_DIR, { recursive: true })

  const buffer = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(buffer))

  const result = await createImage(`/uploads/${filename}`)

  return c.json({ id: result.id, path: result.path })
})

export { upload }
