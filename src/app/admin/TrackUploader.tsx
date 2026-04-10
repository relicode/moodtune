'use client'

import Add from '@mui/icons-material/Add'
import CheckCircle from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'

import { useSnackbar } from '$/hooks/useSnackbar'
import { track } from '$/lib/analytics'
import { parseFilename } from '$/lib/filename'

type TrackUploaderProps = {
  branchId: string
  onUploaded: () => void
  pool?: 'main' | 'random'
}

type FileEntry = {
  file: File
  title: string
  artist: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const TrackUploader = ({ branchId, onUploaded, pool = 'main' }: TrackUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const { showSnackbar } = useSnackbar()

  const dialogOpen = files.length > 0

  const handleAddClick = () => {
    inputRef.current?.click()
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    const entries: FileEntry[] = Array.from(selected).map((file) => {
      const parsed = parseFilename(file.name)
      return {
        file,
        title: parsed.title ?? '',
        artist: parsed.artist ?? '',
        status: 'pending' as const,
      }
    })

    setFiles(entries)

    // Reset input so the same files can be re-selected
    e.target.value = ''
  }

  const handleFieldChange = (index: number, field: 'title' | 'artist', value: string) => {
    setFiles((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)))
  }

  const handleUpload = async () => {
    setUploading(true)
    let succeeded = 0
    let failed = 0

    // Snapshot files at upload start -- fields are disabled during upload so values cannot change
    const snapshot = files

    for (let i = 0; i < snapshot.length; i++) {
      setFiles((prev) => prev.map((entry, j) => (j === i ? { ...entry, status: 'uploading' } : entry)))

      const entry = snapshot[i]
      const formData = new FormData()
      formData.set('branchId', branchId)
      formData.set('title', entry.title)
      formData.set('artist', entry.artist)
      formData.set('audio', entry.file)
      if (pool === 'random') formData.set('pool', 'random')

      try {
        const res = await fetch('/api/admin/track', { method: 'POST', body: formData })
        if (!res.ok) {
          const errorMsg = res.headers.get('content-type')?.includes('application/json')
            ? ((await res.json()) as { error?: string }).error || 'Upload failed'
            : `Upload failed (${res.status})`
          failed++
          setFiles((prev) => prev.map((e, j) => (j === i ? { ...e, status: 'error', error: errorMsg } : e)))
          continue
        }
        const data = (await res.json()) as { success?: boolean; error?: string }
        if (data.success) {
          succeeded++
          setFiles((prev) => prev.map((e, j) => (j === i ? { ...e, status: 'done' } : e)))
        } else {
          failed++
          setFiles((prev) =>
            prev.map((e, j) => (j === i ? { ...e, status: 'error', error: data.error || 'Upload failed' } : e))
          )
        }
      } catch {
        failed++
        setFiles((prev) => prev.map((e, j) => (j === i ? { ...e, status: 'error', error: 'Upload failed' } : e)))
      }
    }

    setUploading(false)

    if (succeeded > 0) {
      track('admin-track-upload', { branchId, count: succeeded })
      onUploaded()
    }

    const parts: string[] = []
    if (succeeded > 0) parts.push(`${succeeded} uploaded`)
    if (failed > 0) parts.push(`${failed} failed`)
    showSnackbar(parts.join(', '), failed > 0 ? 'error' : 'success')
  }

  const handleClose = () => {
    if (!uploading) setFiles([])
  }

  const doneCount = files.filter((f) => f.status === 'done' || f.status === 'error').length
  const uploadFinished = !uploading && files.some((f) => f.status === 'done' || f.status === 'error')

  return (
    <>
      <input ref={inputRef} type="file" accept="audio/*" multiple hidden onChange={handleFilesSelected} />
      <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddClick}>
        Add
      </Button>
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Tracks</DialogTitle>
        <DialogContent>
          {uploading && (
            <LinearProgress variant="determinate" value={(doneCount / files.length) * 100} sx={{ mb: 2 }} />
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            {files.map((entry, index) => (
              <Stack key={index} direction="row" spacing={1.5} alignItems="center">
                {entry.status === 'pending' && <Box sx={{ width: 20, height: 20, flexShrink: 0 }} />}
                {entry.status === 'uploading' && <CircularProgress size={20} />}
                {entry.status === 'done' && <CheckCircle color="success" fontSize="small" />}
                {entry.status === 'error' && (
                  <Tooltip title={entry.error ?? 'Upload failed'}>
                    <ErrorIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    minWidth: 120,
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title={entry.file.name}
                >
                  {entry.file.name}
                </Typography>
                <TextField
                  label="Title"
                  size="small"
                  value={entry.title}
                  onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
                  disabled={uploading}
                  autoComplete="off"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Artist"
                  size="small"
                  value={entry.artist}
                  onChange={(e) => handleFieldChange(index, 'artist', e.target.value)}
                  disabled={uploading}
                  autoComplete="off"
                  sx={{ flex: 1 }}
                />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={uploading}>
            {uploadFinished ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading || uploadFinished}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default TrackUploader
