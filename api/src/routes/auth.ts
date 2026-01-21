import { Hono } from 'hono'
import { zValidator } from '../lib/validation.js'
import { loginSchema, registerSchema } from '../schemas/index.js'
import * as authService from '../services/auth.js'

const auth = new Hono()
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')
    const result = await authService.login(email, password)
    return c.json(result)
  })
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password, name } = c.req.valid('json')
    const result = await authService.register(email, password, name)
    return c.json(result)
  })
  .post('/logout', (c) => {
    return c.json({ success: true })
  })

export { auth }
