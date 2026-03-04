'use client'

import Button from '@mui/material/Button'

import { logout } from '$/actions/auth'
import { track } from '$/lib/analytics'

const AdminLogoutButton = () => (
  <Button
    color="inherit"
    onClick={() => {
      track('auth-logout')
      logout()
    }}
  >
    Logout
  </Button>
)

export default AdminLogoutButton
