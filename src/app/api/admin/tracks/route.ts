import { NextResponse } from 'next/server'

import { getBranchTracks } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'

export const GET = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  if (!branchId) {
    return NextResponse.json({ error: 'branchId required' }, { status: 400 })
  }

  const tracks = await getBranchTracks(branchId)
  return NextResponse.json({ tracks })
}
