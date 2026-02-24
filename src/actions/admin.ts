'use server'

import { revalidatePath } from 'next/cache'

import {
  addChildBranch,
  createBranch,
  deleteBranchRecursive,
  getBranch,
  removeChildBranch,
  updateBranch,
} from '$/data/branches'
import { IMAGE_BUCKET, removeFile } from '$/data/minio'
import { deleteTrack, removeRandomTrackFromBranch, removeTrackFromBranch, updateTrack } from '$/data/tracks'
import { createUser, deleteUser } from '$/data/users'
import {
  addRootBranch,
  addUserToVenue,
  createVenue,
  deleteVenue,
  removeRootBranch,
  removeUserFromVenue,
  updateVenue,
} from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'
import { BranchType, UserRole } from '$/types'
import type { ActionResult, PlaylistUiOption, SessionPayload } from '$/types'

const IMAGE_PATH_RE = /^image\/[0-9a-f-]+\.\w+$/

type AdminCheck = { error: ActionResult } | { session: SessionPayload }

const requireAdmin = async (): Promise<AdminCheck> => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== UserRole.ADMIN) {
    return { error: { success: false, error: 'Unauthorized' } }
  }
  return { session }
}

export const createVenueAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const name = formData.get('name') as string

  if (!name) return { success: false, error: 'Name is required' }

  await createVenue(name, '')
  revalidatePath('/admin')
  return { success: true }
}

export const updateVenueAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const venueId = formData.get('venueId') as string
  const name = formData.get('name') as string

  if (!venueId) return { success: false, error: 'Venue ID is required' }
  if (!name) return { success: false, error: 'Name is required' }

  await updateVenue(venueId, { name })
  revalidatePath('/admin')
  return { success: true }
}

export const deleteVenueAction = async (venueId: string): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await deleteVenue(venueId)
  revalidatePath('/admin')
  return { success: true }
}

export const createVenueUserAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const venueId = formData.get('venueId') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) return { success: false, error: 'Username and password are required' }

  let user
  try {
    user = await createUser(username, password, UserRole.USER)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create user' }
  }

  await addUserToVenue(venueId, user.id)
  revalidatePath('/admin')
  return { success: true }
}

export const deleteVenueUserAction = async (venueId: string, userId: string): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await removeUserFromVenue(venueId, userId)
  await deleteUser(userId)
  revalidatePath('/admin')
  return { success: true }
}

export const createBranchAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const venueId = formData.get('venueId') as string
  const parentId = (formData.get('parentId') as string) || undefined
  const name = formData.get('name') as string
  const type = formData.get('type') as BranchType
  const rawImagePath = (formData.get('imagePath') as string) || undefined
  const imagePath = rawImagePath && IMAGE_PATH_RE.test(rawImagePath) ? rawImagePath : undefined

  if (!name || !type) return { success: false, error: 'Name and type are required' }

  const branch = await createBranch(venueId, parentId, name, type, imagePath)

  if (parentId) {
    await addChildBranch(parentId, branch.id)
  } else {
    await addRootBranch(venueId, branch.id)
  }

  revalidatePath('/admin')
  return { success: true }
}

export const deleteBranchAction = async (
  venueId: string,
  branchId: string,
  parentId?: string
): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (parentId) {
    await removeChildBranch(parentId, branchId)
  } else {
    await removeRootBranch(venueId, branchId)
  }

  await deleteBranchRecursive(branchId)
  revalidatePath('/admin')
  return { success: true }
}

export const updateTrackAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const trackId = formData.get('trackId') as string
  const title = formData.get('title') as string
  const artist = formData.get('artist') as string

  if (!trackId) return { success: false, error: 'Track ID is required' }
  if (!title) return { success: false, error: 'Title is required' }

  await updateTrack(trackId, { title, artist: artist || '' })
  revalidatePath('/admin')
  return { success: true }
}

export const removeTrackAction = async (
  branchId: string,
  trackId: string,
  pool: 'main' | 'random' = 'main'
): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (pool === 'random') {
    await removeRandomTrackFromBranch(branchId, trackId)
  } else {
    await removeTrackFromBranch(branchId, trackId)
  }
  await deleteTrack(trackId)
  revalidatePath('/admin')
  return { success: true }
}

export const setBranchRandomAction = async (branchId: string, random: number): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (!Number.isFinite(random) || random < 0 || random > 100) {
    return { success: false, error: 'Random must be between 0 and 100' }
  }

  await updateBranch(branchId, { random: Math.round(random) })
  revalidatePath('/admin')
  return { success: true }
}

export const updateBranchSettingsAction = async (
  branchId: string,
  settings: Partial<{ name: string; ui: PlaylistUiOption[] }>
): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await updateBranch(branchId, settings)
  revalidatePath('/admin')
  return { success: true }
}

export const updateBranchImageAction = async (branchId: string, imagePath: string): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  if (!IMAGE_PATH_RE.test(imagePath)) {
    return { success: false, error: 'Invalid image path' }
  }

  const branch = await getBranch(branchId)
  if (branch?.imagePath) {
    await removeFile(IMAGE_BUCKET, branch.imagePath).catch(() => {})
  }

  await updateBranch(branchId, { imagePath })
  revalidatePath('/admin')
  return { success: true }
}
