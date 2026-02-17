import 'server-only'

import { compare, hash } from 'bcryptjs'

import type { User, UserRole } from '$/types'
import { hashCreate, hashGet } from './dal'
import redis from './redis'

const schema = {} as const

export const createUser = async (username: string, password: string, role: UserRole): Promise<User> => {
  const existing = await redis.get(`user:byUsername:${username}`)
  if (existing) throw new Error(`Username "${username}" is already taken`)

  const passwordHash = await hash(password, 12)
  const user = await hashCreate<User>('user', { username, passwordHash, role }, schema)
  await redis.set(`user:byUsername:${username}`, user.id)

  return user
}

export const getUserById = async (id: string): Promise<User | null> => hashGet<User>(`user:${id}`, schema)

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const id = await redis.get(`user:byUsername:${username}`)
  if (!id) return null
  return getUserById(id)
}

export const verifyPassword = async (password: string, passwordHash: string) => compare(password, passwordHash)

export const deleteUser = async (id: string) => {
  const user = await getUserById(id)
  if (!user) return

  await redis.del(`user:${id}`)
  await redis.del(`user:byUsername:${user.username}`)
}
