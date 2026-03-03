'use client'

import InstallDesktopIcon from '@mui/icons-material/InstallDesktop'
import InstallMobileIcon from '@mui/icons-material/InstallMobile'
import IconButton from '@mui/material/IconButton'
import { useTheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'

import { useServiceWorker } from '$/hooks/useServiceWorker'

const InstallButton = () => {
  const { deferredPrompt } = useServiceWorker()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  if (!deferredPrompt) return null

  const handleClick = () => {
    deferredPrompt.prompt()
  }

  return (
    <Tooltip title="Install app">
      <IconButton onClick={handleClick} color="primary" aria-label="Install app">
        {isDesktop ? <InstallDesktopIcon /> : <InstallMobileIcon />}
      </IconButton>
    </Tooltip>
  )
}

export default InstallButton
