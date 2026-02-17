'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import { getImageUrl } from '$/actions/media'

type ImagePickerProps = {
  name: string
  existingPath?: string | null
}

const ImagePicker = ({ name, existingPath }: ImagePickerProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [existingUrl, setExistingUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!existingPath) return
    let cancelled = false
    const load = async () => {
      const url = await getImageUrl(existingPath)
      if (!cancelled) setExistingUrl(url)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [existingPath])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setError(null)
    setUploading(true)

    try {
      const body = new FormData()
      body.append('image', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Upload failed')
        setPreview(null)
        return
      }

      setImagePath(json.imagePath)
    } catch {
      setError('Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const displayUrl = preview ?? existingUrl

  return (
    <Stack spacing={1}>
      <input type="hidden" name={name} value={imagePath ?? ''} />
      <Button component="label" variant="text" size="small" disabled={uploading}>
        {uploading ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            Uploading...
          </>
        ) : displayUrl ? (
          'Change image'
        ) : (
          'Add image'
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      </Button>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      {displayUrl && (
        <Box
          component="img"
          src={displayUrl}
          alt="Branch image"
          sx={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 1 }}
        />
      )}
      {!displayUrl && existingPath && !error && (
        <Typography variant="caption" color="text.secondary">
          Loading image...
        </Typography>
      )}
    </Stack>
  )
}

export default ImagePicker
