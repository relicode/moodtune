import 'server-only'

import type { Branch, BranchType } from '$/types'
import { hashCreate, hashGet, hashSet, listAll, listGetAll, listPush, listRemove } from './dal'
import { IMAGE_BUCKET, removeFile } from './minio'
import redis from './redis'
import { deleteTrack } from './tracks'
import { getRootBranchIds } from './venues'

const schema = {
  parentId: 'nullable',
  imagePath: 'nullable',
  random: 'number',
  shuffle: 'boolean',
  shuffleVisibleToUser: 'boolean',
  ui: 'json',
} as const

export const createBranch = async (
  venueId: string,
  parentId: string | null,
  name: string,
  type: BranchType,
  imagePath: string | null,
  random = 0,
  shuffle = true,
  shuffleVisibleToUser = true,
  ui: string[] = []
): Promise<Branch> =>
  hashCreate<Branch>(
    'branch',
    { venueId, parentId, name, type, imagePath, random, shuffle, shuffleVisibleToUser, ui },
    schema
  )

export const getBranch = async (id: string): Promise<Branch | null> => hashGet<Branch>(`branch:${id}`, schema)

export const getChildBranches = async (parentId: string): Promise<Branch[]> =>
  listGetAll(`branch:${parentId}:children`, getBranch)

export const addChildBranch = async (parentId: string, childId: string) => {
  await listPush(`branch:${parentId}:children`, childId)
}

export const removeChildBranch = async (parentId: string, childId: string) => {
  await listRemove(`branch:${parentId}:children`, childId)
}

export const deleteBranchRecursive = async (id: string) => {
  const childIds = await listAll(`branch:${id}:children`)
  for (const childId of childIds) {
    await deleteBranchRecursive(childId)
  }

  const trackIds = await listAll(`branch:${id}:tracks`)
  for (const trackId of trackIds) {
    await deleteTrack(trackId)
  }

  const randomTrackIds = await listAll(`branch:${id}:randomTracks`)
  for (const trackId of randomTrackIds) {
    await deleteTrack(trackId)
  }

  const branch = await getBranch(id)
  if (branch?.imagePath) {
    await removeFile(IMAGE_BUCKET, branch.imagePath)
  }

  await redis.del(`branch:${id}`)
  await redis.del(`branch:${id}:children`)
  await redis.del(`branch:${id}:tracks`)
  await redis.del(`branch:${id}:randomTracks`)
}

// Max folder nesting depth to prevent runaway recursion and circular references
const MAX_COLLECT_DEPTH = 10

const collectPlaylists = async (branchId: string, depth = 0): Promise<Branch[]> => {
  if (depth >= MAX_COLLECT_DEPTH) return []

  const branch = await getBranch(branchId)
  if (!branch) return []
  if (branch.type === 'playlist') return [branch]

  const children = await getChildBranches(branchId)
  const nested = await Promise.all(children.map((c) => collectPlaylists(c.id, depth + 1)))
  return nested.flat()
}

export const getRecentPlaylists = async (venueIds: string[]): Promise<Branch[]> => {
  const rootIdArrays = await Promise.all(venueIds.map(getRootBranchIds))
  const allRootIds = rootIdArrays.flat()
  const playlistArrays = await Promise.all(allRootIds.map(collectPlaylists))
  const playlists = playlistArrays.flat()

  playlists.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return playlists.slice(0, 3)
}

export const updateBranch = async (
  id: string,
  updates: Partial<Pick<Branch, 'name' | 'type' | 'imagePath' | 'random' | 'shuffle' | 'shuffleVisibleToUser' | 'ui'>>
) => {
  const mapped: Record<string, unknown> = {}
  if (updates.name !== undefined) mapped.name = updates.name
  if (updates.type !== undefined) mapped.type = updates.type
  if (updates.imagePath !== undefined) mapped.imagePath = updates.imagePath
  if (updates.random !== undefined) mapped.random = updates.random
  if (updates.shuffle !== undefined) mapped.shuffle = updates.shuffle
  if (updates.shuffleVisibleToUser !== undefined) mapped.shuffleVisibleToUser = updates.shuffleVisibleToUser
  if (updates.ui !== undefined) mapped.ui = updates.ui

  if (Object.keys(mapped).length > 0) {
    await hashSet(`branch:${id}`, mapped, schema)
  }
}
