import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { health } from './routes/health.js'
import { auth } from './routes/auth.js'
import { products } from './routes/products.js'
import { offers } from './routes/offers.js'
import { upload } from './routes/upload.js'
import { transactions } from './routes/transactions.js'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
  })
)

app.use('/uploads/*', serveStatic({ root: './' }))

app.route('/api/health', health)
app.route('/api/auth', auth)
app.route('/api/products', products)
app.route('/api/offers', offers)
app.route('/api/upload', upload)
app.route('/api/transactions', transactions)

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Server starting on port ${port}`)

serve({ fetch: app.fetch, port })
