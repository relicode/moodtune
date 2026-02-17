'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState, useRef } from 'react'

import { createBranchAction } from '$/actions/admin'
import type { ActionResult } from '$/types'
import ImagePicker from './ImagePicker'

type BranchCreateFormProps = {
  venueId: string
  parentId?: string
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const BranchCreateForm = ({ venueId, parentId, open, onClose, onCreated }: BranchCreateFormProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const label = parentId ? 'New sub-branch' : 'New branch'

  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('venueId', venueId)
      if (parentId) formData.set('parentId', parentId)
      const result = await createBranchAction(prev, formData)
      if (result.success) {
        formRef.current?.reset()
        onClose()
        onCreated()
      }
      return result
    },
    { success: false }
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Stack component="form" ref={formRef} action={formAction}>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField name="name" label="Name" size="small" required autoComplete="off" />
            <FormControl size="small">
              <InputLabel>Type</InputLabel>
              <Select name="type" label="Type" defaultValue="folder">
                <MenuItem value="folder">Folder</MenuItem>
                <MenuItem value="playlist">Playlist</MenuItem>
              </Select>
            </FormControl>
            <ImagePicker name="image" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            Add
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  )
}

export default BranchCreateForm
