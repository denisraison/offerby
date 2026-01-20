import { db } from '../index.js'

export const findUserByEmail = (email: string) =>
  db
    .selectFrom('users')
    .select(['id', 'email', 'name', 'password_hash'])
    .where('email', '=', email)
    .executeTakeFirst()

export const findUserIdByEmail = (email: string) =>
  db
    .selectFrom('users')
    .select(['id'])
    .where('email', '=', email)
    .executeTakeFirst()

export const createUser = (data: {
  email: string
  name: string
  passwordHash: string
}) =>
  db
    .insertInto('users')
    .values({
      email: data.email,
      name: data.name,
      password_hash: data.passwordHash,
    })
    .returning(['id', 'email', 'name'])
    .executeTakeFirstOrThrow()
