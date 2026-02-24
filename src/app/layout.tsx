import GlobalStyles from '@mui/material/GlobalStyles'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'

import ThemeRegistry from '$/app/ThemeRegistry'

const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

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
      {umamiUrl && umamiWebsiteId && (
        <Script src={umamiUrl} data-website-id={umamiWebsiteId} strategy="afterInteractive" />
      )}
    </body>
  </html>
)

export default RootLayout
