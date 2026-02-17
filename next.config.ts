import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  poweredByHeader: false,
  serverExternalPackages: ['ioredis', 'ffprobe-static'],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
