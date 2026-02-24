import Breadcrumbs from '@mui/material/Breadcrumbs'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getImageUrl } from '$/actions/media'
import AudioPlayer from '$/components/AudioPlayer'
import BranchGrid from '$/components/BranchGrid'
import Link from '$/components/Link'
import { getBranch, getChildBranches } from '$/data/branches'
import { getPlaylistTracks, getRandomTracks } from '$/data/tracks'
import { getVenue } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'
import { BranchType, PlaylistUiOption, UserRole } from '$/types'
import type { Playlist, PlaylistTrack, Track } from '$/types'

const MAX_ANCESTOR_DEPTH = 10

const mapTrack = (branchId: string, track: Track): PlaylistTrack => ({
  id: track.id,
  url: `/api/audio/${branchId}/${track.id}`,
  name: track.title,
  artist: track.artist,
  duration: track.duration,
})

const stripTrack = (track: PlaylistTrack): PlaylistTrack<false> => ({
  id: track.id,
  url: track.url,
  duration: track.duration,
})

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

  if (branch.type === BranchType.FOLDER) {
    const children = await getChildBranches(branchId)
    const branchItems = children.map((child) => ({
      id: child.id,
      name: child.name,
      imageUrl: child.imagePath ? getImageUrl(child.imagePath) : null,
    }))
    return (
      <Stack spacing={2}>
        {header}
        <BranchGrid venueId={venueId} branches={branchItems} />
      </Stack>
    )
  }

  const session = await getSessionFromCookie()
  const isAdmin = session?.role === UserRole.ADMIN

  const [tracks, randomTracks] = await Promise.all([getPlaylistTracks(branchId), getRandomTracks(branchId)])

  const showNames = isAdmin || branch.ui.includes(PlaylistUiOption.SHOW_TRACK_NAMES)
  const mapped = tracks.map((t) => mapTrack(branchId, t))
  const mappedRandom = randomTracks.map((t) => mapTrack(branchId, t))

  const playlist: Playlist<boolean> = showNames
    ? {
        id: branch.id,
        name: branch.name,
        tracks: mapped,
        randomTracks: mappedRandom,
        randomTrackProbability: branch.random,
        ui: branch.ui,
      }
    : {
        id: branch.id,
        name: branch.name,
        tracks: mapped.map(stripTrack),
        randomTracks: mappedRandom.map(stripTrack),
        randomTrackProbability: branch.random,
        ui: branch.ui,
      }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <AudioPlayer playlist={playlist} isAdmin={isAdmin} username={session?.username} />
    </Stack>
  )
}

export default BranchPage
