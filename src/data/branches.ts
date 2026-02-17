import 'server-only'

import type { Branch, BranchType } from '$/types'
import redis from './redis'
import { getRootBranchIds } from './venues'

export const createBranch = async (
  venueId: string,
  parentId: string | null,
  name: string,
  type: BranchType,
  imagePath: string | null
): Promise<Branch> => {
  const id = crypto.randomUUID()
  const branch: Branch = {
    id,
    venueId,
    parentId: parentId ?? '',
    name,
    type,
    imagePath: imagePath ?? '',
    createdAt: new Date().toISOString(),
  }

  await redis.hset(`branch:${id}`, branch)

  return branch
}

export const getBranch = async (id: string): Promise<Branch | null> => {
  const data = await redis.hgetall(`branch:${id}`)
  if (!data.id) return null
  return {
    ...data,
    parentId: data.parentId || null,
    imagePath: data.imagePath || null,
  } as unknown as Branch
}

export const getChildBranches = async (parentId: string): Promise<Branch[]> => {
  const ids = await redis.lrange(`branch:${parentId}:children`, 0, -1)
  const branches = await Promise.all(ids.map(getBranch))
  return branches.filter((b): b is Branch => b !== null)
}

export const addChildBranch = async (parentId: string, childId: string) => {
  await redis.rpush(`branch:${parentId}:children`, childId)
}

export const removeChildBranch = async (parentId: string, childId: string) => {
  await redis.lrem(`branch:${parentId}:children`, 0, childId)
}

export const deleteBranchRecursive = async (id: string) => {
  const childIds = await redis.lrange(`branch:${id}:children`, 0, -1)
  for (const childId of childIds) {
    await deleteBranchRecursive(childId)
  }

  await redis.del(`branch:${id}`)
  await redis.del(`branch:${id}:children`)
  await redis.del(`branch:${id}:tracks`)
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

export const updateBranch = async (id: string, updates: Partial<Pick<Branch, 'name' | 'type' | 'imagePath'>>) => {
  const mapped: Record<string, string> = {}
  if (updates.name !== undefined) mapped.name = updates.name
  if (updates.type !== undefined) mapped.type = updates.type
  if (updates.imagePath !== undefined) mapped.imagePath = updates.imagePath ?? ''

  if (Object.keys(mapped).length > 0) {
    await redis.hset(`branch:${id}`, mapped)
  }
}
