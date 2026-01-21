import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcrypt'
import { zValidator } from '../lib/validation.js'
import { loginSchema, registerSchema } from '../schemas/index.js'
import { findUserByEmail, findUserIdByEmail, createUser } from '../../db/repositories/users.js'

const auth = new Hono()

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const user = await findUserByEmail(email)
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const validPassword = await bcrypt.compare(password, user.password_hash)
  if (!validPassword) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return c.json({ error: 'Server configuration error' }, 500)
  }

  const payload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  }

  const token = await sign(payload, secret)

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
})

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json')

  const existingUser = await findUserIdByEmail(email)
  if (existingUser) {
    return c.json({ error: 'Email already exists' }, 400)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await createUser({
    email,
    name,
    passwordHash,
  })

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return c.json({ error: 'Server configuration error' }, 500)
  }

  const payload = {
    sub: result.id,
    email: result.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  }

  const token = await sign(payload, secret)

  return c.json({
    token,
    user: {
      id: result.id,
      email: result.email,
      name: result.name,
    },
  })
})

auth.post('/logout', (c) => {
  return c.json({ success: true })
})

export { auth }
