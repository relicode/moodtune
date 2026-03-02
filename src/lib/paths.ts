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

export const getTempDir = () => {
  const dir = process.env.UPLOAD_TMP_DIR
  if (!dir) throw new Error('UPLOAD_TMP_DIR must be set')
  return dir
}

export const getFfmpegPath = () => process.env.FFMPEG_PATH || resolveBin('ffmpeg')

export const getFfprobePath = () => process.env.FFPROBE_PATH || resolveBin('ffprobe')
