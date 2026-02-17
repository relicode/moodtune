'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useRef, useState } from 'react'

type TrackUploaderProps = {
  branchId: string
  onUploaded: () => void
}

type SnackState = {
  open: boolean
  severity: 'success' | 'error'
  message: string
}

const TrackUploader = ({ branchId, onUploaded }: TrackUploaderProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [uploading, setUploading] = useState(false)
  const [snack, setSnack] = useState<SnackState>({ open: false, severity: 'success', message: '' })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    formData.set('branchId', branchId)

    setUploading(true)
    try {
      const res = await fetch('/api/admin/upload-track', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        formRef.current?.reset()
        setSnack({ open: true, severity: 'success', message: 'Track uploaded' })
        onUploaded()
      } else {
        setSnack({ open: true, severity: 'error', message: data.error || 'Upload failed' })
      }
    } catch {
      setSnack({ open: true, severity: 'error', message: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const handleSnackClose = () => {
    setSnack((prev) => ({ ...prev, open: false }))
  }

  return (
    <>
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={handleSnackClose}>
          {snack.message}
        </Alert>
      </Snackbar>
      <Stack
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        direction="row"
        spacing={2}
        sx={{ mt: 2 }}
        alignItems="center"
      >
        <TextField name="title" label="Title" size="small" autoComplete="off" />
        <TextField name="artist" label="Artist" size="small" autoComplete="off" />
        <Button component="label" variant="text" size="small">
          Audio
          <input type="file" name="audio" accept="audio/*" hidden required />
        </Button>
        <Button type="submit" variant="outlined" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </Stack>
    </>
  )
}

export default TrackUploader
