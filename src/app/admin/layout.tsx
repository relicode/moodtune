import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

import { getSessionFromCookie } from '$/lib/session'
import AdminLogoutButton from './AdminLogoutButton'

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSessionFromCookie()

  return (
    <Stack sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Moodtune Admin
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {session?.username}
          </Typography>
          <AdminLogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        {children}
      </Container>
    </Stack>
  )
}

export default AdminLayout
