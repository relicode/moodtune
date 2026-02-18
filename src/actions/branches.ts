'use server'

import { getBranch } from '$/data/branches'
import { getSessionFromCookie } from '$/lib/session'
import { UserRole } from '$/types'

export const getParentBranchInfo = async (branchId: string): Promise<{ parentId: string; venueId: string } | null> => {
  const session = await getSessionFromCookie()
  if (!session) return null

  const branch = await getBranch(branchId)
  if (!branch?.parentId) return null

  // Non-admin users may only access branches in their assigned venues
  if (session.role !== UserRole.ADMIN && !session.venueIds.includes(branch.venueId)) return null

  return { parentId: branch.parentId, venueId: branch.venueId }
}
