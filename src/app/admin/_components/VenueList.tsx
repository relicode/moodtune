import Stack from '@mui/material/Stack'

import type { Venue } from '$/types'
import VenueCard from './VenueCard'

type VenueListProps = {
  venues: Venue[]
}

const VenueList = ({ venues }: VenueListProps) => (
  <Stack spacing={2}>
    {venues.map((venue) => (
      <VenueCard key={venue.id} venue={venue} />
    ))}
  </Stack>
)

export default VenueList
