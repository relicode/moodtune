import Breadcrumbs from '@mui/material/Breadcrumbs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getImageUrl } from '$/actions/media'
import AudioPlayer from '$/components/AudioPlayer'
import BranchGrid from '$/components/BranchGrid'
import Link from '$/components/Link'
import { getBranch, getChildBranches } from '$/data/branches'
import { getVenue } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'

const MAX_ANCESTOR_DEPTH = 10

const BranchPage = async ({ params }: { params: Promise<{ venueId: string; branchId: string }> }) => {
  const { venueId, branchId } = await params
  const branch = await getBranch(branchId)

  if (!branch) {
    return <Typography variant="h5">Branch not found</Typography>
  }

  const venue = await getVenue(venueId)

  const ancestors: { id: string; name: string }[] = []
  let currentParentId = branch.parentId
  while (currentParentId && ancestors.length < MAX_ANCESTOR_DEPTH) {
    const parent = await getBranch(currentParentId)
    if (!parent) break
    ancestors.unshift({ id: parent.id, name: parent.name })
    currentParentId = parent.parentId
  }

  const header = (
    <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="h4">{branch.name}</Typography>
      <Breadcrumbs separator="/">
        <Link href={`/venue/${venueId}`} variant="body2" color="text.secondary" underline="hover">
          {venue?.name ?? 'Venue'}
        </Link>
        {ancestors.map((ancestor) => (
          <Link
            key={ancestor.id}
            href={`/venue/${venueId}/${ancestor.id}`}
            variant="body2"
            color="text.secondary"
            underline="hover"
          >
            {ancestor.name}
          </Link>
        ))}
      </Breadcrumbs>
    </Stack>
  )

  if (branch.type === 'folder') {
    const children = await getChildBranches(branchId)
    const branchItems = await Promise.all(
      children.map(async (child) => ({
        id: child.id,
        name: child.name,
        imageUrl: child.imagePath ? await getImageUrl(child.imagePath) : null,
      }))
    )
    return (
      <Stack spacing={2}>
        {header}
        <BranchGrid venueId={venueId} branches={branchItems} />
      </Stack>
    )
  }

  const session = await getSessionFromCookie()
  const isAdmin = session?.role === 'admin'

  return (
    <Stack spacing={2} sx={!isAdmin ? { flex: 1, justifyContent: 'center' } : undefined}>
      {header}
      <AudioPlayer branchId={branchId} role={session?.role ?? 'user'} />
    </Stack>
  )
}

export default BranchPage
