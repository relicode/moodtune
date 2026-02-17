import Typography from '@mui/material/Typography'

import { getAllVenues } from '$/data/venues'
import VenueCreateForm from './_components/VenueCreateForm'
import VenueList from './_components/VenueList'

const AdminPage = async () => {
  const venues = await getAllVenues()

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Venues
      </Typography>
      <VenueCreateForm />
      <VenueList venues={venues} />
    </>
  )
}

export default AdminPage
