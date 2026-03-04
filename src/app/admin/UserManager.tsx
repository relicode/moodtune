'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useConfirm } from 'material-ui-confirm'
import { useActionState, useEffect, useRef, useState } from 'react'

import { createVenueUserAction, deleteVenueUserAction } from '$/actions/admin'
import { useSnackbar } from '$/hooks/useSnackbar'
import { track } from '$/lib/analytics'
import type { ActionResult, User } from '$/types'

type UserManagerProps = {
  venueId: string
}

const UserManager = ({ venueId }: UserManagerProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const confirm = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { showSnackbar } = useSnackbar()

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/venue-users/${venueId}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadUsers is stable via React Compiler; including it would cause an infinite loop
  }, [venueId])

  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('venueId', venueId)
      const result = await createVenueUserAction(prev, formData)
      if (result.success) {
        track('admin-user-create', { username: formData.get('username') as string })
        formRef.current?.reset()
        loadUsers()
      } else if (result.error) {
        showSnackbar(result.error, 'error')
      }
      return result
    },
    { success: false }
  )

  const handleDeleteUser = async (userId: string, username: string) => {
    const { confirmed } = await confirm({ description: `Remove user "${username}"?` })
    if (!confirmed) return
    track('admin-user-delete', { userId })
    await deleteVenueUserAction(venueId, userId)
    loadUsers()
  }

  return (
    <>
      <Stack component="form" ref={formRef} action={formAction} direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField name="username" label="Username" size="small" required autoComplete="off" />
        <TextField name="password" label="Password" type="password" size="small" required />
        <Button type="submit" variant="outlined" disabled={pending}>
          Add User
        </Button>
      </Stack>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading users...
        </Typography>
      ) : users.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No users assigned to this venue.
        </Typography>
      ) : (
        <List dense>
          {users.map((user) => (
            <ListItem
              key={user.id}
              secondaryAction={
                <Tooltip title="Delete user">
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={() => handleDeleteUser(user.id, user.username)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemText primary={user.username} />
            </ListItem>
          ))}
        </List>
      )}
    </>
  )
}

export default UserManager
