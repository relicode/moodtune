import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { getImageUrl } from '$/actions/media'
import BranchGrid from '$/components/BranchGrid'
import { getBranch } from '$/data/branches'
import { getRootBranchIds, getVenue } from '$/data/venues'

const VenuePage = async ({ params }: { params: Promise<{ venueId: string }> }) => {
  const { venueId } = await params
  const venue = await getVenue(venueId)
  const branchIds = await getRootBranchIds(venueId)
  const branchesRaw = await Promise.all(branchIds.map(getBranch))
  const branches = branchesRaw.filter((b) => b !== null)

  const branchItems = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    imageUrl: branch.imagePath ? getImageUrl(branch.imagePath) : null,
  }))

  return (
    <>
      {venue && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h4">{venue.name}</Typography>
          {venue.description && (
            <Typography variant="body1" color="text.secondary">
              {venue.description}
            </Typography>
          )}
        </Box>
      )}
      <BranchGrid venueId={venueId} branches={branchItems} />
    </>
  )
}

export default VenuePage
