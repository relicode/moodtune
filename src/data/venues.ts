import 'server-only'

import type { Venue } from '$/types'
import { hashCreate, hashGet, listAll, listPush, listRemove, setAdd, setAll, setGetAll, setHas, setRemove } from './dal'
import redis from './redis'

const schema = {} as const

export const createVenue = async (name: string, description: string): Promise<Venue> => {
  const venue = await hashCreate<Venue>('venue', { name, description }, schema)
  await setAdd('venues', venue.id)
  return venue
}

export const getVenue = async (id: string): Promise<Venue | null> => hashGet<Venue>(`venue:${id}`, schema)

export const getAllVenues = async (): Promise<Venue[]> => setGetAll('venues', getVenue)

export const deleteVenue = async (id: string) => {
  await redis.del(`venue:${id}`)
  await setRemove('venues', id)
  await redis.del(`venue:${id}:users`)
  await redis.del(`venue:${id}:branches`)
}

export const addUserToVenue = async (venueId: string, userId: string) => {
  await setAdd(`venue:${venueId}:users`, userId)
}

export const removeUserFromVenue = async (venueId: string, userId: string) => {
  await setRemove(`venue:${venueId}:users`, userId)
}

export const getVenueUserIds = async (venueId: string): Promise<string[]> => setAll(`venue:${venueId}:users`)

export const isUserInVenue = async (venueId: string, userId: string): Promise<boolean> =>
  setHas(`venue:${venueId}:users`, userId)

export const getRootBranchIds = async (venueId: string): Promise<string[]> =>
  listAll(`venue:${venueId}:branches`)

export const addRootBranch = async (venueId: string, branchId: string) => {
  await listPush(`venue:${venueId}:branches`, branchId)
}

export const removeRootBranch = async (venueId: string, branchId: string) => {
  await listRemove(`venue:${venueId}:branches`, branchId)
}
