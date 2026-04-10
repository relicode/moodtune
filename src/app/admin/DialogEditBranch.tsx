'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState } from 'react'

import { updateBranchImageAction, updateBranchSettingsAction } from '$/actions/admin'
import { useSnackbar } from '$/hooks/useSnackbar'
import { track } from '$/lib/analytics'
import type { Branch } from '$/types'
import ImageUpload from './ImageUpload'

type DialogEditBranchProps = {
  branch: Branch
  open: boolean
  onClose: () => void
}

const DialogEditBranch = ({ branch, open, onClose }: DialogEditBranchProps) => {
  const [name, setName] = useState(branch.name)
  const [nameSaving, setNameSaving] = useState(false)
  const { showSnackbar } = useSnackbar()

  const handleImageUpload = async (imagePath: string) => {
    const result = await updateBranchImageAction(branch.id, imagePath)
    if (!result.success) {
      showSnackbar(result.error ?? 'Failed to update image', 'error')
    }
  }

  return (
    <Dialog open={open} onClose={nameSaving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit branch</DialogTitle>
      <DialogContent>
        <Stack direction="row" alignItems="center" justifyContent="space-evenly" spacing={2} sx={{ pt: 1 }}>
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={async () => {
              const trimmed = name.trim()
              if (trimmed && trimmed !== branch.name) {
                setNameSaving(true)
                try {
                  const result = await updateBranchSettingsAction(branch.id, { name: trimmed })
                  if (result.success) {
                    track('admin-branch-update', { branchId: branch.id, name: trimmed })
                  } else {
                    setName(branch.name)
                    showSnackbar(result.error ?? 'Failed to rename branch', 'error')
                  }
                } catch {
                  setName(branch.name)
                  showSnackbar('Failed to rename branch', 'error')
                } finally {
                  setNameSaving(false)
                }
              } else {
                setName(branch.name)
              }
            }}
            variant="standard"
            autoComplete="off"
            slotProps={{
              input: {
                sx: { fontSize: '1.25rem', fontWeight: 500, textAlign: 'center' },
              },
            }}
          />
          <ImageUpload existingPath={branch.imagePath} onUpload={handleImageUpload} size={96} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={nameSaving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogEditBranch
