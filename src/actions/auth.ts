'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getUserByUsername, verifyPassword } from '$/data/users'
import { getAllVenues, getVenueUserIds } from '$/data/venues'
import { createLogger } from '$/lib/logger'
import { getClientIp } from '$/lib/request'
import { createSession, deleteSessionCookie, getSessionFromCookie, setSessionCookie } from '$/lib/session'
import { UserRole } from '$/types'
import type { ActionResult } from '$/types'

const log = createLogger('auth')

export const login = async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const ip = getClientIp(await headers())

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' }
  }

  await deleteSessionCookie()

  const user = await getUserByUsername(username)
  if (!user) {
    log.warn({ username, attemptedPassword: password, ip }, 'login failed — unknown user')
    return { success: false, error: 'Invalid credentials' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    log.warn({ username, attemptedPassword: password, ip }, 'login failed — invalid password')
    return { success: false, error: 'Invalid credentials' }
  }

  if (user.role === UserRole.ADMIN) {
    const token = await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      venueIds: [],
    })

    await setSessionCookie(token)
    log.info({ username, role: user.role, ip }, 'login success')
    redirect('/admin')
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
    log.warn({ username, ip }, 'login failed — no venues assigned')
    return { success: false, error: 'No venues assigned to this user' }
  }

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
    venueIds,
  })

  await setSessionCookie(token)
  log.info({ username, role: user.role, venueCount: venueIds.length, ip }, 'login success')
  redirect(`/venue/${venueIds[0]}`)
}

export const logout = async () => {
  const session = await getSessionFromCookie()
  log.info({ userId: session?.userId, username: session?.username }, 'logout')
  await deleteSessionCookie()
  redirect('/')
}
