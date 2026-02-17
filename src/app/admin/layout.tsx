import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

import { getSessionFromCookie } from '$/lib/session'
import AdminLogoutButton from './_components/AdminLogoutButton'

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSessionFromCookie()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
      <Box sx={{ flex: 1, p: 3 }}>{children}</Box>
    </Box>
  )
}

export default AdminLayout
