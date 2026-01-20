import { db } from '../index.js'

export const createImage = (path: string) =>
  db
    .insertInto('product_images')
    .values({ path })
    .returning(['id', 'path'])
    .executeTakeFirstOrThrow()
