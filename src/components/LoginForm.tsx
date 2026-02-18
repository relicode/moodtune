'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useActionState } from 'react'

import type { ActionResult } from '$/types'

type LoginFormProps = {
  title: string
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
}

const LoginForm = ({ title, action }: LoginFormProps) => {
  const [state, formAction, pending] = useActionState(action, { success: false })

  return (
    <Box
      component="form"
      action={formAction}
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 8,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h4" textAlign="center">
        {title}
      </Typography>

      {state.error && <Alert severity="error">{state.error}</Alert>}

      <TextField name="username" label="Username" required autoComplete="off" />
      <TextField name="password" label="Password" type="password" required />

      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? 'Signing in...' : 'Sign In'}
      </Button>
    </Box>
  )
}

export default LoginForm
