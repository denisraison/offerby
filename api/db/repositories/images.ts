import { db } from '../index.js'

export const createImage = (path: string, uploadedBy: number) =>
  db
    .insertInto('product_images')
    .values({ path, uploaded_by: uploadedBy })
    .returning(['id', 'path'])
    .executeTakeFirstOrThrow()