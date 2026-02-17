import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import { getAllVenues } from '$/data/venues'
import VenueCreateForm from './_components/VenueCreateForm'
import VenueList from './_components/VenueList'

const AdminPage = async () => {
  const venues = await getAllVenues()

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Venues
        </Typography>
        <VenueCreateForm />
      </Paper>
      <VenueList venues={venues} />
    </>
  )
}

export default AdminPage
