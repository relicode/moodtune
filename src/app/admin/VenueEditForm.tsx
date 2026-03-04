'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState } from 'react'

import { updateVenueAction } from '$/actions/admin'
import { track } from '$/lib/analytics'
import type { ActionResult, Venue } from '$/types'

type VenueEditFormProps = {
  venue: Venue
  open: boolean
  onClose: () => void
}

const VenueEditForm = ({ venue, open, onClose }: VenueEditFormProps) => {
  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('venueId', venue.id)
      const result = await updateVenueAction(prev, formData)
      if (result.success) {
        track('admin-venue-update', { venueId: venue.id, name: formData.get('name') as string })
        onClose()
      }
      return result
    },
    { success: false }
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Stack component="form" action={formAction}>
        <DialogTitle>Edit venue</DialogTitle>
        <DialogContent>
          <TextField
            name="name"
            label="Name"
            size="small"
            defaultValue={venue.name}
            required
            autoComplete="off"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            Save
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  )
}

export default VenueEditForm
