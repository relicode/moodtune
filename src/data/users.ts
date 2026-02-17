import 'server-only'

import { compare, hash } from 'bcryptjs'

import type { User, UserRole } from '$/types'
import redis from './redis'

export const createUser = async (username: string, password: string, role: UserRole): Promise<User> => {
  const id = crypto.randomUUID()
  const passwordHash = await hash(password, 12)
  const user: User = {
    id,
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  }

  await redis.hset(`user:${id}`, user)
  await redis.set(`user:byUsername:${username}`, id)

  return user
}

export const getUserById = async (id: string): Promise<User | null> => {
  const data = await redis.hgetall(`user:${id}`)
  if (!data.id) return null
  return data as unknown as User
}

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
