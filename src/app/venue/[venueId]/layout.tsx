import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import VenueBottomNav from '$/components/VenueBottomNav'
import { getRecentPlaylists } from '$/data/branches'
import { getSessionFromCookie } from '$/lib/session'
import type { PlaylistSummary } from '$/types'

const VenueLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSessionFromCookie()

  const playlists: PlaylistSummary[] =
    session && session.role === 'user'
      ? (await getRecentPlaylists(session.venueIds)).map((b) => ({ id: b.id, venueId: b.venueId, name: b.name }))
      : []

  return (
    <Stack sx={{ flexGrow: 1 }}>
      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>{children}</Box>
      {session?.role === 'user' && <VenueBottomNav playlists={playlists} />}
    </Stack>
  )
}

export default VenueLayout
