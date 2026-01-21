import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import type { UsersRepository } from '../../db/repositories/users.js'
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

interface AuthServiceDeps {
  users: UsersRepository
}

export const createAuthService = ({ users }: AuthServiceDeps) => {
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

  return {
    async login(email: string, password: string): Promise<AuthResult> {
      const user = await users.findByEmail(email)
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
    },

    async register(email: string, password: string, name: string): Promise<AuthResult> {
      const existingUser = await users.findIdByEmail(email)
      if (existingUser) {
        throw new AlreadyExistsError('Email already exists')
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const result = await users.create({
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
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
