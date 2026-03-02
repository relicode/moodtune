import 'server-only'

import { existsSync } from 'fs'
import { arch } from 'os'
import { join } from 'path'

const archDir = arch() === 'arm64' ? 'arm64' : 'amd64'

const binCache = new Map<string, string>()

const resolveBin = (name: string) => {
  const cached = binCache.get(name)
  if (cached) return cached

  const containerPath = join('/data/bins', archDir, name)
  const resolved = existsSync(containerPath) ? containerPath : name
  binCache.set(name, resolved)
  return resolved
}

export const getTempDir = () => (process.env.NODE_ENV === 'production' ? '/data/uploads' : '/tmp')

export const getFfmpegPath = () => resolveBin('ffmpeg')

export const getFfprobePath = () => resolveBin('ffprobe')
