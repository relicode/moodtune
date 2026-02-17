import 'server-only'

import type { Venue } from '$/types'
import redis from './redis'

export const createVenue = async (name: string, description: string): Promise<Venue> => {
  const id = crypto.randomUUID()
  const venue: Venue = {
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
  }

  await redis.hset(`venue:${id}`, venue)
  await redis.sadd('venues', id)

  return venue
}

export const getVenue = async (id: string): Promise<Venue | null> => {
  const data = await redis.hgetall(`venue:${id}`)
  if (!data.id) return null
  return data as unknown as Venue
}

export const getAllVenues = async (): Promise<Venue[]> => {
  const ids = await redis.smembers('venues')
  const venues = await Promise.all(ids.map(getVenue))
  return venues.filter((v): v is Venue => v !== null)
}

export const deleteVenue = async (id: string) => {
  await redis.del(`venue:${id}`)
  await redis.srem('venues', id)
  await redis.del(`venue:${id}:users`)
  await redis.del(`venue:${id}:branches`)
}

export const addUserToVenue = async (venueId: string, userId: string) => {
  await redis.sadd(`venue:${venueId}:users`, userId)
}

export const removeUserFromVenue = async (venueId: string, userId: string) => {
  await redis.srem(`venue:${venueId}:users`, userId)
}

export const getVenueUserIds = async (venueId: string): Promise<string[]> => redis.smembers(`venue:${venueId}:users`)

export const isUserInVenue = async (venueId: string, userId: string): Promise<boolean> => {
  const result = await redis.sismember(`venue:${venueId}:users`, userId)
  return result === 1
}

export const getRootBranchIds = async (venueId: string): Promise<string[]> =>
  redis.lrange(`venue:${venueId}:branches`, 0, -1)

export const addRootBranch = async (venueId: string, branchId: string) => {
  await redis.rpush(`venue:${venueId}:branches`, branchId)
}

export const removeRootBranch = async (venueId: string, branchId: string) => {
  await redis.lrem(`venue:${venueId}:branches`, 0, branchId)
}
