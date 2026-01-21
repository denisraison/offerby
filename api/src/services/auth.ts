import { sign } from 'hono/jwt'
import bcrypt from 'bcrypt'
import { findUserByEmail, findUserIdByEmail, createUser } from '../../db/repositories/users.js'
import { UnauthorisedError, AlreadyExistsError, ServerError } from './errors.js'

interface UserResponse {
  id: number
  email: string
  name: string
}

interface AuthResult {
  token: string
  user: UserResponse
}

async function createToken(userId: number, email: string): Promise<string> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new ServerError('Server configuration error')
  }

  const payload = {
    sub: userId,
    email: email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
  }

  return sign(payload, secret)
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email)
  if (!user) {
    throw new UnauthorisedError('Invalid credentials')
  }

  const validPassword = await bcrypt.compare(password, user.password_hash)
  if (!validPassword) {
    throw new UnauthorisedError('Invalid credentials')
  }

  const token = await createToken(user.id, user.email)

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  const existingUser = await findUserIdByEmail(email)
  if (existingUser) {
    throw new AlreadyExistsError('Email already exists')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await createUser({
    email,
    name,
    passwordHash,
  })

  const token = await createToken(result.id, result.email)

  return {
    token,
    user: {
      id: result.id,
      email: result.email,
      name: result.name,
    },
  }
}
