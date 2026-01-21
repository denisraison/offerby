import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { repositories } from '../db/repositories/index.js'
import { repositoriesMiddleware } from './middleware/repositories.js'
import type { AppVariables } from './context.js'
import { health } from './routes/health.js'
import { auth } from './routes/auth.js'
import { products } from './routes/products.js'
import { offers } from './routes/offers.js'
import { upload } from './routes/upload.js'
import { transactions } from './routes/transactions.js'

const app = new Hono<{ Variables: AppVariables }>()

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  })
)
app.use('*', repositoriesMiddleware(repositories))

app.use('/uploads/*', serveStatic({ root: './' }))

const routes = app
  .route('/api/health', health)
  .route('/api/auth', auth)
  .route('/api/products', products)
  .route('/api/offers', offers)
  .route('/api/upload', upload)
  .route('/api/transactions', transactions)

export type AppType = typeof routes

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Server starting on port ${port}`)

serve({ fetch: app.fetch, port })
