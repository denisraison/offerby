import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { InvalidStateError } from '../services/errors.js'
import type { AppVariables } from '../context.js'

const upload = new Hono<{ Variables: AppVariables }>()
  .post('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      throw new InvalidStateError('No file provided')
    }

    const { upload: uploadService } = c.get('services')
    const result = await uploadService.uploadImage(file, user.id)
    return c.json(result)
  })

export { upload }
