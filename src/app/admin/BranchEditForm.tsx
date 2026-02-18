'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState } from 'react'

import { updateBranchAction } from '$/actions/admin'
import { BranchType } from '$/types'
import type { ActionResult, Branch } from '$/types'
import ImagePicker from './ImagePicker'

type BranchEditFormProps = {
  branch: Branch
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

const BranchEditForm = ({ branch, open, onClose, onUpdated }: BranchEditFormProps) => {
  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('branchId', branch.id)
      const result = await updateBranchAction(prev, formData)
      if (result.success) {
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
        <DialogTitle>{branch.type === BranchType.PLAYLIST ? 'Edit playlist' : 'Edit branch'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField name="name" label="Name" size="small" defaultValue={branch.name} required autoComplete="off" />
            <ImagePicker name="image" existingPath={branch.imagePath} />
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

export default BranchEditForm
