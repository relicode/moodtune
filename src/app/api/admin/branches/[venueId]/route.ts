import { NextResponse } from 'next/server'

import { getBranch, getChildBranches } from '$/data/branches'
import { getRootBranchIds } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'
import { UserRole } from '$/types'

export const GET = async (request: Request, { params }: { params: Promise<{ venueId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { venueId } = await params
  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get('parentId')

  let branches
  if (parentId) {
    branches = await getChildBranches(parentId)
  } else {
    const ids = await getRootBranchIds(venueId)
    const results = await Promise.all(ids.map(getBranch))
    branches = results.filter((b) => b !== null)
  }

  return NextResponse.json({ branches })
}
