import type { MetadataRoute } from 'next'

const manifest = (): MetadataRoute.Manifest => ({
  id: '/',
  name: 'Moodtune',
  short_name: 'Moodtune',
  description: 'Ambiance for your venue',
  start_url: '/',
  display: 'standalone',
  background_color: '#F5F5F5',
  theme_color: '#00796B',
  icons: [
    { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
})

export default manifest
