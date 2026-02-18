'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useEffect, useState } from 'react'

import { getImageUrl } from '$/actions/media'

type ImagePickerProps = {
  name: string
  existingPath?: string | null
}

const ImagePicker = ({ name, existingPath }: ImagePickerProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const existingUrl = existingPath ? getImageUrl(existingPath) : null

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (preview) URL.revokeObjectURL(preview)
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  const displayUrl = preview ?? existingUrl

  return (
    <Stack spacing={1}>
      <Button component="label" variant="text" size="small">
        {displayUrl ? 'Change image' : 'Add image'}
        <input type="file" name={name} accept="image/*" hidden onChange={handleChange} />
      </Button>
      {displayUrl && (
        <Box
          component="img"
          src={displayUrl}
          alt="Branch image"
          sx={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 1 }}
        />
      )}
    </Stack>
  )
}

export default ImagePicker
