import 'server-only'

import { execFile as execFileCb } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

import { createLogger } from '$/lib/logger'
import { TEMP_DIR } from '$/lib/paths'

const log = createLogger('ffmpeg')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static')

const execFile = promisify(execFileCb)

/** Target bitrate for AAC compression (192 kbps = 24,000 bytes/sec) */
export const TARGET_BITRATE_KBPS = 192
export const TARGET_BYTES_PER_SEC = (TARGET_BITRATE_KBPS * 1000) / 8

/** Compress audio to AAC/M4A. Returns the output file path — caller must clean up. */
export const compressToM4a = async (inputPath: string): Promise<string> => {
  const outputPath = join(TEMP_DIR, `moodtune-out-${crypto.randomUUID()}.m4a`)
  await execFile(ffmpegPath, [
    '-i',
    inputPath,
    '-c:a',
    'aac',
    '-b:a',
    `${TARGET_BITRATE_KBPS}k`,
    '-movflags',
    '+faststart',
    '-y',
    outputPath,
  ])
  log.info({ inputPath, outputPath, targetBitrate: `${TARGET_BITRATE_KBPS}kbps` }, 'compression complete')
  return outputPath
}
