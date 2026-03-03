'use client'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { ConfirmProvider } from 'material-ui-confirm'

import { ServiceWorkerProvider } from '$/hooks/useServiceWorker'
import { SnackbarProvider } from '$/hooks/useSnackbar'
import theme from '$/theme'

const ThemeRegistry = ({ children }: { children: React.ReactNode }) => (
  <AppRouterCacheProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConfirmProvider
        defaultOptions={{
          cancellationButtonProps: { color: 'info' },
          confirmationButtonProps: { color: 'error' },
        }}
      >
        <SnackbarProvider>
          <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
        </SnackbarProvider>
      </ConfirmProvider>
    </ThemeProvider>
  </AppRouterCacheProvider>
)

export default ThemeRegistry
