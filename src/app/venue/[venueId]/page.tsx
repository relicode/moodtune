import { getImageUrl } from '$/actions/media'
import BranchGrid from '$/components/BranchGrid'
import { getBranch } from '$/data/branches'
import { getRootBranchIds } from '$/data/venues'

const VenuePage = async ({ params }: { params: Promise<{ venueId: string }> }) => {
  const { venueId } = await params
  const branchIds = await getRootBranchIds(venueId)
  const branchesRaw = await Promise.all(branchIds.map(getBranch))
  const branches = branchesRaw.filter((b) => b !== null)

  const branchItems = await Promise.all(
    branches.map(async (branch) => ({
      id: branch.id,
      name: branch.name,
      imageUrl: branch.imagePath ? await getImageUrl(branch.imagePath) : null,
    }))
  )

  return <BranchGrid venueId={venueId} branches={branchItems} />
}

export default VenuePage
