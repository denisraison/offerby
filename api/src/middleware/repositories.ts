import type { Context, Next } from 'hono'
import type { Repositories } from '../../db/repositories/index.js'
import { createServices } from '../services/index.js'

export function repositoriesMiddleware(repositories: Repositories) {
  const services = createServices(repositories)

  return async (c: Context, next: Next) => {
    c.set('repositories', repositories)
    c.set('services', services)
    await next()
  }
}
