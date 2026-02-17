'use server'

import { revalidatePath } from 'next/cache'

import { addChildBranch, createBranch, deleteBranchRecursive, removeChildBranch, updateBranch } from '$/data/branches'
import { IMAGE_BUCKET, uploadFile } from '$/data/minio'
import { deleteTrack, removeTrackFromBranch, updateTrack } from '$/data/tracks'
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
import { sanitizeExtension } from '$/lib/filename'
import { getSessionFromCookie } from '$/lib/session'
import type { ActionResult, SessionPayload } from '$/types'

type AdminCheck = { error: ActionResult } | { session: SessionPayload }

const requireAdmin = async (): Promise<AdminCheck> => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
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
    user = await createUser(username, password, 'user')
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
  const parentId = (formData.get('parentId') as string) || null
  const name = formData.get('name') as string
  const type = formData.get('type') as 'folder' | 'playlist'
  const imageFile = formData.get('image') as File | null

  if (!name || !type) return { success: false, error: 'Name and type are required' }

  let imagePath: string | null = null
  if (imageFile && imageFile.size > 0) {
    const ext = sanitizeExtension(imageFile.name)
    const objectName = `image/${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    await uploadFile(IMAGE_BUCKET, objectName, buffer, imageFile.type)
    imagePath = objectName
  }

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
  parentId: string | null
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

export const updateBranchAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const branchId = formData.get('branchId') as string
  const name = formData.get('name') as string
  const imageFile = formData.get('image') as File | null

  const updates: Partial<{ name: string; imagePath: string | null }> = {}
  if (name) updates.name = name

  if (imageFile && imageFile.size > 0) {
    const ext = sanitizeExtension(imageFile.name)
    const objectName = `image/${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    await uploadFile(IMAGE_BUCKET, objectName, buffer, imageFile.type)
    updates.imagePath = objectName
  }

  await updateBranch(branchId, updates)
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

export const removeTrackAction = async (branchId: string, trackId: string): Promise<ActionResult> => {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await removeTrackFromBranch(branchId, trackId)
  await deleteTrack(trackId)
  revalidatePath('/admin')
  return { success: true }
}
