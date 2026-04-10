'use client'

import ImageIcon from '@mui/icons-material/Image'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useEffect, useRef, useState } from 'react'

import { getImageUrl } from '$/actions/media'
import { useSnackbar } from '$/hooks/useSnackbar'

type ImageUploadProps = {
  existingPath?: string | null
  onUpload: (imagePath: string) => void
  size?: number
}

const ImageUpload = ({ existingPath, onUpload, size = 48 }: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { showSnackbar } = useSnackbar()

  const imageUrl = localPreview ?? (existingPath ? getImageUrl(existingPath) : null)

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview]
  )

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (localPreview) URL.revokeObjectURL(localPreview)
    const previewUrl = URL.createObjectURL(file)
    setLocalPreview(previewUrl)
    setUploading(true)

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
      onUpload(imagePath)
    } catch {
      URL.revokeObjectURL(previewUrl)
      setLocalPreview(null)
      showSnackbar('Failed to upload image', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <Tooltip title={imageUrl ? 'Change image' : 'Add image'}>
        <IconButton onClick={() => inputRef.current?.click()} disabled={uploading}>
          {imageUrl ? <Avatar src={imageUrl} sx={{ width: size, height: size }} /> : <ImageIcon />}
        </IconButton>
      </Tooltip>
      {uploading && (
        <CircularProgress size={size + 8} sx={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }} />
      )}
    </Box>
  )
}

export default ImageUpload
