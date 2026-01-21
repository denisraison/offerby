import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID').transform(Number),
})

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long (max 255 characters)'),
  description: z.string().max(2000, 'Description too long (max 2000 characters)').optional(),
  price: z
    .number()
    .int('Price must be a whole number')
    .positive('Price must be a positive integer (cents)'),
  imageIds: z.array(z.number().int()).max(5, 'Maximum 5 images allowed').optional(),
})

export const amountSchema = z.object({
  amount: z
    .number()
    .int('Amount must be a whole number')
    .positive('Amount must be a positive integer (cents)'),
})

export const purchaseSchema = z.object({
  offerId: z.number().int().positive().optional(),
})

export const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
})

export const offersQuerySchema = z.object({
  status: z.enum(['pending', 'accepted']).optional(),
  seller: z.literal('me').optional(),
  buyer: z.literal('me').optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(50),
  offset: z.string().regex(/^\d+$/).transform(Number).optional().default(0),
})

export const productsQuerySchema = z.object({
  seller: z.literal('me').optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(50),
  offset: z.string().regex(/^\d+$/).transform(Number).optional().default(0),
})

