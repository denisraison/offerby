import type { Kysely } from 'kysely'
import type { Database } from '../types.js'

export const createUsersRepository = (database: Kysely<Database>) => ({
  findByEmail: (email: string) =>
    database
      .selectFrom('users')
      .select(['id', 'email', 'name', 'password_hash'])
      .where('email', '=', email)
      .limit(1)
      .executeTakeFirst(),

  findIdByEmail: (email: string) =>
    database
      .selectFrom('users')
      .select(['id'])
      .where('email', '=', email)
      .limit(1)
      .executeTakeFirst(),

  create: (data: { email: string; name: string; passwordHash: string }) =>
    database
      .insertInto('users')
      .values({
        email: data.email,
        name: data.name,
        password_hash: data.passwordHash,
      })
      .returning(['id', 'email', 'name'])
      .executeTakeFirstOrThrow(),
})

export type UsersRepository = ReturnType<typeof createUsersRepository>
