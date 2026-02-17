'use client'

import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState, useRef } from 'react'

import { createBranchAction } from '$/actions/admin'
import type { ActionResult } from '$/types'

type BranchCreateFormProps = {
  venueId: string
  parentId: string | null
  onCreated: () => void
}

const BranchCreateForm = ({ venueId, parentId, onCreated }: BranchCreateFormProps) => {
  const formRef = useRef<HTMLFormElement>(null)

  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      formData.set('venueId', venueId)
      if (parentId) formData.set('parentId', parentId)
      const result = await createBranchAction(prev, formData)
      if (result.success) {
        formRef.current?.reset()
        onCreated()
      }
      return result
    },
    { success: false }
  )

  return (
    <Stack
      component="form"
      ref={formRef}
      action={formAction}
      direction="row"
      spacing={2}
      sx={{ mb: 2 }}
      alignItems="center"
    >
      <TextField name="name" label="Branch Name" size="small" required autoComplete="off" />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Type</InputLabel>
        <Select name="type" label="Type" defaultValue="folder">
          <MenuItem value="folder">Folder</MenuItem>
          <MenuItem value="playlist">Playlist</MenuItem>
        </Select>
      </FormControl>
      <Button component="label" variant="text" size="small">
        Image
        <input type="file" name="image" accept="image/*" hidden />
      </Button>
      <Button type="submit" variant="outlined" disabled={pending}>
        Add
      </Button>
    </Stack>
  )
}

export default BranchCreateForm
