'use client'

import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--font-inter), Roboto, Arial, sans-serif',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#00796B' },
        secondary: { main: '#FFB300' },
        background: { default: '#F5F5F5' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4DB6AC' },
        secondary: { main: '#FFD54F' },
      },
    },
  },
  components: {
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },
  },
})

export default theme
