import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  poweredByHeader: false,
  serverExternalPackages: ['ioredis', 'ffmpeg-static', 'ffprobe-static', 'sharp', 'pino', 'pino-pretty'],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
