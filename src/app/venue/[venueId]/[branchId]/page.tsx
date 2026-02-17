import Typography from '@mui/material/Typography'

import { getImageUrl } from '$/actions/media'
import AudioPlayer from '$/components/AudioPlayer'
import BranchGrid from '$/components/BranchGrid'
import { getBranch, getChildBranches } from '$/data/branches'

const BranchPage = async ({ params }: { params: Promise<{ venueId: string; branchId: string }> }) => {
  const { venueId, branchId } = await params
  const branch = await getBranch(branchId)

  if (!branch) {
    return <Typography variant="h5">Branch not found</Typography>
  }

  if (branch.type === 'folder') {
    const children = await getChildBranches(branchId)
    const branchItems = await Promise.all(
      children.map(async (child) => ({
        id: child.id,
        name: child.name,
        imageUrl: child.imagePath ? await getImageUrl(child.imagePath) : null,
      }))
    )
    return <BranchGrid venueId={venueId} branches={branchItems} />
  }

  return <AudioPlayer branchId={branchId} />
}

export default BranchPage
