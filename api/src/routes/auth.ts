import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcrypt'
import { findUserByEmail, findUserIdByEmail, createUser } from '../../db/repositories/users.js'

const auth = new Hono()

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

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

auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { email, password, name } = body

  if (!email) {
    return c.json({ error: 'Email is required' }, 400)
  }
  if (!password) {
    return c.json({ error: 'Password is required' }, 400)
  }
  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

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
