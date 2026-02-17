import { NextResponse } from 'next/server'

import { getPlaylistTracks } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'

export const GET = async (_request: Request, { params }: { params: Promise<{ branchId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { branchId } = await params

  const tracks = await getPlaylistTracks(branchId)
  return NextResponse.json({ tracks })
}
