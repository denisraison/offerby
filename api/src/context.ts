import type { Repositories } from '../db/repositories/index.js'
import type { Services } from './services/index.js'

export interface AuthUser {
  id: number
  email: string
}

export interface AppVariables {
  user: AuthUser
  repositories: Repositories
  services: Services
}
