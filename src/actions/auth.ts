'use server'

import { redirect } from 'next/navigation'

import { getUserByUsername, verifyPassword } from '$/data/users'
import { getAllVenues, getVenueUserIds } from '$/data/venues'
import { createSession, deleteSessionCookie, setSessionCookie } from '$/lib/session'
import type { LoginFormState } from '$/types'

export const loginVenueUser = async (_prev: LoginFormState, formData: FormData): Promise<LoginFormState> => {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' }
  }

  const user = await getUserByUsername(username)
  if (!user || user.role !== 'user') {
    return { success: false, error: 'Invalid credentials' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { success: false, error: 'Invalid credentials' }
  }

  const venues = await getAllVenues()
  const venueIds: string[] = []

  for (const venue of venues) {
    const userIds = await getVenueUserIds(venue.id)
    if (userIds.includes(user.id)) {
      venueIds.push(venue.id)
    }
  }

  if (venueIds.length === 0) {
    return { success: false, error: 'No venues assigned to this user' }
  }

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    venueIds,
  })

  await setSessionCookie(token)
  redirect(`/venue/${venueIds[0]}`)
}

export const loginAdmin = async (_prev: LoginFormState, formData: FormData): Promise<LoginFormState> => {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' }
  }

  const user = await getUserByUsername(username)
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Invalid credentials' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { success: false, error: 'Invalid credentials' }
  }

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    venueIds: [],
  })

  await setSessionCookie(token)
  redirect('/admin')
}

export const logout = async () => {
  await deleteSessionCookie()
  redirect('/')
}
