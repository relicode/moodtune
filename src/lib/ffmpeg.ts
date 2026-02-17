import 'server-only'

import { execFile as execFileCb } from 'child_process'
import { readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static')

const execFile = promisify(execFileCb)

/** Target bitrate for AAC compression (192 kbps = 24,000 bytes/sec) */
export const TARGET_BITRATE_KBPS = 192
export const TARGET_BYTES_PER_SEC = (TARGET_BITRATE_KBPS * 1000) / 8

export const compressToM4a = async (inputPath: string): Promise<Buffer> => {
  const outputPath = join(tmpdir(), `moodtune-out-${crypto.randomUUID()}.m4a`)

  try {
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
    return await readFile(outputPath)
  } finally {
    await unlink(outputPath).catch(() => {})
  }
}
