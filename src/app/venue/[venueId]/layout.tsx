import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import VenueBottomNav from '$/components/VenueBottomNav'
import { getRecentPlaylists } from '$/data/branches'
import { getVenue } from '$/data/venues'
import { getSessionFromCookie } from '$/lib/session'
import type { PlaylistSummary } from '$/types'

const VenueLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ venueId: string }>
}) => {
  const { venueId } = await params
  const venue = await getVenue(venueId)
  const session = await getSessionFromCookie()

  const playlists: PlaylistSummary[] =
    session && session.role === 'user'
      ? (await getRecentPlaylists(session.venueIds)).map((b) => ({ id: b.id, venueId: b.venueId, name: b.name }))
      : []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        {venue && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4">{venue.name}</Typography>
            {venue.description && (
              <Typography variant="body1" color="text.secondary">
                {venue.description}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Box>
      {session?.role === 'user' && <VenueBottomNav playlists={playlists} />}
    </Box>
  )
}

export default VenueLayout
