'use client'

import Button from '@mui/material/Button'

import { logout } from '$/actions/auth'

const AdminLogoutButton = () => (
  <Button color="inherit" onClick={() => logout()}>
    Logout
  </Button>
)

export default AdminLogoutButton
