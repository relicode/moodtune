import GlobalStyles from '@mui/material/GlobalStyles'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import ThemeRegistry from '$/app/ThemeRegistry'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Moodtune',
  description: 'Moodtune - Ambiance for your venue',
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => (
  <html lang="en" suppressHydrationWarning>
    <body className={inter.variable}>
      <InitColorSchemeScript attribute="class" />
      <ThemeRegistry>
        <GlobalStyles
          styles={{ 'html, body': { height: '100%' }, body: { display: 'flex', flexDirection: 'column' } }}
        />
        {children}
      </ThemeRegistry>
    </body>
  </html>
)

export default RootLayout
