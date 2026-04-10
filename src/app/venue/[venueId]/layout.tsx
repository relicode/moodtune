import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'

import AnalyticsIdentify from '$/components/AnalyticsIdentify'
import VenueBottomNav from '$/components/VenueBottomNav'
import { getRecentPlaylists } from '$/data/branches'
import { getSessionFromCookie } from '$/lib/session'
import type { PlaylistSummary } from '$/types'

const VenueLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSessionFromCookie()

  const playlists: PlaylistSummary[] = session
    ? (await getRecentPlaylists(session.venueIds)).map((b) => ({ id: b.id, venueId: b.venueId, name: b.name }))
    : []

  return (
    <Stack sx={{ flexGrow: 1, minHeight: 0 }}>
      {session && <AnalyticsIdentify username={session.username} />}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="md" sx={{ py: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {children}
        </Container>
      </Box>
      {session && <VenueBottomNav playlists={playlists} role={session.role} />}
    </Stack>
  )
}

export default VenueLayout
