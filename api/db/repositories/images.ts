import type { Kysely } from 'kysely'
import type { Database } from '../types.js'

export const createImagesRepository = (database: Kysely<Database>) => ({
  create: (path: string, uploadedBy: number) =>
    database
      .insertInto('product_images')
      .values({ path, uploaded_by: uploadedBy })
      .returning(['id', 'path'])
      .executeTakeFirstOrThrow(),
})

export type ImagesRepository = ReturnType<typeof createImagesRepository>
