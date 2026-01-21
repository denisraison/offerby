import { zValidator as baseZValidator } from '@hono/zod-validator'
import type { z } from 'zod'

type ValidationTarget = 'json' | 'query' | 'param' | 'header' | 'cookie' | 'form'

export function zValidator<T extends ValidationTarget, S extends z.ZodTypeAny>(
  target: T,
  schema: S
) {
  return baseZValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400)
    }
  })
}
