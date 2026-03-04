'use client'

import FolderIcon from '@mui/icons-material/Folder'
import QueueMusicIcon from '@mui/icons-material/QueueMusic'
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
import { useActionState, useRef, useState } from 'react'

import { createBranchAction } from '$/actions/admin'
import { track } from '$/lib/analytics'
import { BranchType } from '$/types'
import type { ActionResult } from '$/types'
import ImageUpload from './ImageUpload'

type BranchCreateFormProps = {
  venueId: string
  parentId?: string
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const BranchCreateForm = ({ venueId, parentId, open, onClose, onCreated }: BranchCreateFormProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState(0)
  const label = parentId ? 'New sub-branch' : 'New branch'

  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('venueId', venueId)
      if (parentId) formData.set('parentId', parentId)
      if (imagePath) formData.set('imagePath', imagePath)

      const result = await createBranchAction(prev, formData)
      if (result.success) {
        track('admin-branch-create', { venueId, name: formData.get('name') as string })
        formRef.current?.reset()
        setImagePath(null)
        setImageKey((k) => k + 1)
        onClose()
        onCreated()
      }
      return result
    },
    { success: false }
  )

  const handleClose = () => {
    setImagePath(null)
    setImageKey((k) => k + 1)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <Stack component="form" ref={formRef} action={formAction}>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField name="name" label="Name" size="small" required autoComplete="off" sx={{ flex: 5 }} />
              <FormControl size="small" sx={{ flex: 3 }}>
                <InputLabel>Type</InputLabel>
                <Select name="type" label="Type" defaultValue={BranchType.FOLDER}>
                  <MenuItem value={BranchType.FOLDER}>
                    <FolderIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
                    Folder
                  </MenuItem>
                  <MenuItem value={BranchType.PLAYLIST}>
                    <QueueMusicIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
                    Playlist
                  </MenuItem>
                </Select>
              </FormControl>
              <ImageUpload key={imageKey} onUpload={setImagePath} size={40} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            Add
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  )
}

export default BranchCreateForm
