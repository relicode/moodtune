import { NextResponse } from 'next/server'

import { getUserById } from '$/data/users'
import { getVenueUserIds } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'

export const GET = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get('venueId')
  if (!venueId) {
    return NextResponse.json({ error: 'venueId required' }, { status: 400 })
  }

  const userIds = await getVenueUserIds(venueId)
  const users = await Promise.all(userIds.map(getUserById))
  const safeUsers = users
    .filter((u) => u !== null)
    .map(({ id, username, role, createdAt }) => ({ id, username, role, createdAt }))

  return NextResponse.json({ users: safeUsers })
}
