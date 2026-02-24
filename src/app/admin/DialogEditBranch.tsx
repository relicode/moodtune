'use client'

import ImageIcon from '@mui/icons-material/Image'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import { useEffect, useRef, useState } from 'react'

import { updateBranchImageAction, updateBranchSettingsAction } from '$/actions/admin'
import { getImageUrl } from '$/actions/media'
import { useSnackbar } from '$/hooks/useSnackbar'
import type { Branch } from '$/types'

type DialogEditBranchProps = {
  branch: Branch
  open: boolean
  onClose: () => void
}

const DialogEditBranch = ({ branch, open, onClose }: DialogEditBranchProps) => {
  const [name, setName] = useState(branch.name)
  const [nameSaving, setNameSaving] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const imageUrl = localPreview ?? (branch.imagePath ? getImageUrl(branch.imagePath) : null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { showSnackbar } = useSnackbar()

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview]
  )

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (localPreview) URL.revokeObjectURL(localPreview)
    const previewUrl = URL.createObjectURL(file)
    setLocalPreview(previewUrl)
    e.target.value = ''

    const formData = new FormData()
    formData.set('image', file)
    try {
      const res = await fetch('/api/admin/image', { method: 'POST', body: formData })
      if (!res.ok) {
        URL.revokeObjectURL(previewUrl)
        setLocalPreview(null)
        showSnackbar('Failed to upload image', 'error')
        return
      }
      const { imagePath } = (await res.json()) as { imagePath: string }
      const result = await updateBranchImageAction(branch.id, imagePath)
      if (!result.success) {
        URL.revokeObjectURL(previewUrl)
        setLocalPreview(null)
        showSnackbar(result.error ?? 'Failed to update image', 'error')
      }
    } catch {
      URL.revokeObjectURL(previewUrl)
      setLocalPreview(null)
      showSnackbar('Failed to upload image', 'error')
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
                  if (!result.success) {
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
          <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          <Tooltip title="Change image">
            <IconButton size="large" onClick={() => imageInputRef.current?.click()}>
              {imageUrl ? <Avatar src={imageUrl} sx={{ width: 96, height: 96 }} /> : <ImageIcon />}
            </IconButton>
          </Tooltip>
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
