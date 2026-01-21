import { Hono } from 'hono'
import { authMiddleware, type AuthUser } from '../middleware/auth.js'
import { InvalidStateError } from '../services/errors.js'
import * as uploadService from '../services/upload.js'

const upload = new Hono<{ Variables: { user: AuthUser } }>()
  .post('/', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      throw new InvalidStateError('No file provided')
    }

    const result = await uploadService.uploadImage(file, user.id)
    return c.json(result)
  })

export { upload }
