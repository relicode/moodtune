'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useRef, useState } from 'react'

type TrackUploaderProps = {
  branchId: string
  onUploaded: () => void
}

const TrackUploader = ({ branchId, onUploaded }: TrackUploaderProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set('branchId', branchId)

    const audioFile = formData.get('audio') as File | null
    if (audioFile && audioFile.size > 0) {
      const duration = await getAudioDuration(audioFile)
      formData.set('duration', String(duration))
    }

    setUploading(true)
    try {
      const res = await fetch('/api/admin/upload-track', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        formRef.current?.reset()
        onUploaded()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      <Stack
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        direction="row"
        spacing={2}
        sx={{ mt: 2 }}
        alignItems="center"
      >
        <TextField name="title" label="Title" size="small" required autoComplete="off" />
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

const getAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const audio = new Audio()
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration)
      URL.revokeObjectURL(audio.src)
    })
    audio.addEventListener('error', () => {
      resolve(0)
      URL.revokeObjectURL(audio.src)
    })
    audio.src = URL.createObjectURL(file)
  })

export default TrackUploader
