import { NextResponse } from 'next/server'

import { getUserById } from '$/data/users'
import { getVenueUserIds } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'

export const GET = async (_request: Request, { params }: { params: Promise<{ venueId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { venueId } = await params

  const userIds = await getVenueUserIds(venueId)
  const users = await Promise.all(userIds.map(getUserById))
  const safeUsers = users
    .filter((u) => u !== null)
    .map(({ id, username, role, createdAt }) => ({ id, username, role, createdAt }))

  return NextResponse.json({ users: safeUsers })
}
