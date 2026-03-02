import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  allowedDevOrigins: ['192.168.10.20'],
  poweredByHeader: false,
  serverExternalPackages: ['ioredis', 'sharp', 'pino', 'pino-pretty'],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
