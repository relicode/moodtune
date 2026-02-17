'use server'

import { revalidatePath } from 'next/cache'

import { addChildBranch, createBranch, deleteBranchRecursive, removeChildBranch, updateBranch } from '$/data/branches'
import { IMAGE_BUCKET, uploadFile } from '$/data/minio'
import { deleteTrack, removeTrackFromBranch } from '$/data/tracks'
import { createUser, deleteUser } from '$/data/users'
import {
  addRootBranch,
  addUserToVenue,
  createVenue,
  deleteVenue,
  removeRootBranch,
  removeUserFromVenue,
} from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'
import type { ActionResult } from '$/types'

const requireAdmin = async (): Promise<ActionResult | null> => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }
  return null
}

export const createVenueAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || ''

  if (!name) return { success: false, error: 'Name is required' }

  await createVenue(name, description)
  revalidatePath('/admin')
  return { success: true }
}

export const deleteVenueAction = async (venueId: string): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  await deleteVenue(venueId)
  revalidatePath('/admin')
  return { success: true }
}

export const createVenueUserAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  const venueId = formData.get('venueId') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) return { success: false, error: 'Username and password are required' }

  const user = await createUser(username, password, 'user')
  await addUserToVenue(venueId, user.id)
  revalidatePath('/admin')
  return { success: true }
}

export const deleteVenueUserAction = async (venueId: string, userId: string): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  await removeUserFromVenue(venueId, userId)
  await deleteUser(userId)
  revalidatePath('/admin')
  return { success: true }
}

export const createBranchAction = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  const venueId = formData.get('venueId') as string
  const parentId = (formData.get('parentId') as string) || null
  const name = formData.get('name') as string
  const type = formData.get('type') as 'folder' | 'playlist'
  const imageFile = formData.get('image') as File | null

  if (!name || !type) return { success: false, error: 'Name and type are required' }

  let imagePath: string | null = null
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const objectName = `${crypto.randomUUID()}.${ext}`
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
  const authError = await requireAdmin()
  if (authError) return authError

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
  const authError = await requireAdmin()
  if (authError) return authError

  const branchId = formData.get('branchId') as string
  const name = formData.get('name') as string
  const imageFile = formData.get('image') as File | null

  const updates: Partial<{ name: string; imagePath: string | null }> = {}
  if (name) updates.name = name

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const objectName = `${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    await uploadFile(IMAGE_BUCKET, objectName, buffer, imageFile.type)
    updates.imagePath = objectName
  }

  await updateBranch(branchId, updates)
  revalidatePath('/admin')
  return { success: true }
}

export const removeTrackAction = async (branchId: string, trackId: string): Promise<ActionResult> => {
  const authError = await requireAdmin()
  if (authError) return authError

  await removeTrackFromBranch(branchId, trackId)
  await deleteTrack(trackId)
  revalidatePath('/admin')
  return { success: true }
}
