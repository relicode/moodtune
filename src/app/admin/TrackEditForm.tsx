'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState } from 'react'

import { updateTrackAction } from '$/actions/admin'
import { track as trackEvent } from '$/lib/analytics'
import type { ActionResult, Track } from '$/types'

type TrackEditFormProps = {
  track: Track
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

const TrackEditForm = ({ track, open, onClose, onUpdated }: TrackEditFormProps) => {
  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('trackId', track.id)
      const result = await updateTrackAction(prev, formData)
      if (result.success) {
        trackEvent('admin-track-update', { trackId: track.id })
        onClose()
        onUpdated()
      }
      return result
    },
    { success: false }
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Stack component="form" action={formAction}>
        <DialogTitle>Edit track</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField name="title" label="Title" size="small" defaultValue={track.title} required autoComplete="off" />
            <TextField name="artist" label="Artist" size="small" defaultValue={track.artist} autoComplete="off" />
          </Stack>
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

export default TrackEditForm
