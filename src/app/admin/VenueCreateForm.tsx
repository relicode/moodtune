'use client'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useActionState, useRef } from 'react'

import { createVenueAction } from '$/actions/admin'
import { track } from '$/lib/analytics'
import type { ActionResult } from '$/types'

const VenueCreateForm = () => {
  const formRef = useRef<HTMLFormElement>(null)
  const [, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await createVenueAction(prev, formData)
      if (result.success) {
        track('admin-venue-create', { name: formData.get('name') as string })
        formRef.current?.reset()
      }
      return result
    },
    { success: false }
  )

  return (
    <Stack component="form" ref={formRef} action={formAction} direction="row" spacing={2} sx={{ mb: 3 }}>
      <TextField name="name" label="Venue Name" size="small" required autoComplete="off" />
      <Button type="submit" variant="contained" disabled={pending}>
        Add Venue
      </Button>
    </Stack>
  )
}

export default VenueCreateForm
