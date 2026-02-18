'use client'

import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { createContext, useContext, useState } from 'react'

type Severity = 'success' | 'error' | 'warning' | 'info'

type SnackbarContextValue = {
  showSnackbar: (message: string, severity?: Severity) => void
}

const SnackbarContext = createContext<SnackbarContextValue>({
  showSnackbar: () => {},
})

export const useSnackbar = () => useContext(SnackbarContext)

type SnackState = {
  open: boolean
  message: string
  severity: Severity
}

export const SnackbarProvider = ({ children }: { children: React.ReactNode }) => {
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' })

  const showSnackbar = (message: string, severity: Severity = 'success') => {
    setSnack({ open: true, message, severity })
  }

  const handleClose = () => {
    setSnack((prev) => ({ ...prev, open: false }))
  }

  return (
    <SnackbarContext value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={handleClose}>
          {snack.message}
        </Alert>
      </Snackbar>
    </SnackbarContext>
  )
}
