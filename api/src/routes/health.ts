import { Hono } from 'hono'
import { db } from '../../db/index.js'

const health = new Hono()

health.get('/', async (c) => {
  try {
    await db.selectFrom('users').select('id').limit(1).execute()
    return c.json({ status: 'healthy', database: 'connected' })
  } catch {
    return c.json({ status: 'unhealthy', database: 'disconnected' }, 503)
  }
})

export { health }
