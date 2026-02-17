import 'server-only'

import { execFile as execFileCb } from 'child_process'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import ffprobe from 'ffprobe-static'

const execFile = promisify(execFileCb)

export type AudioMetadata = {
  duration: number
  title: string | null
  artist: string | null
  genre: string | null
}

export const extractMetadata = async (buffer: Buffer): Promise<AudioMetadata> => {
  const tmpFile = join(tmpdir(), `moodtune-${crypto.randomUUID()}`)
  await writeFile(tmpFile, buffer, { mode: 0o600 })

  try {
    const data = await probe(tmpFile)
    const tags = data.format?.tags ?? {}
    const duration = parseFloat(data.format?.duration ?? '')

    if (!duration || isNaN(duration)) throw new Error('Could not extract duration from audio file')

    return {
      duration,
      title: tags.title ?? tags.TITLE ?? null,
      artist: tags.artist ?? tags.ARTIST ?? tags.album_artist ?? tags.ALBUM_ARTIST ?? null,
      genre: tags.genre ?? tags.GENRE ?? null,
    }
  } finally {
    await unlink(tmpFile).catch(() => {})
  }
}

type FormatTags = Record<string, string | undefined>

type ProbeOutput = {
  format?: {
    duration?: string
    tags?: FormatTags
  }
}

const probe = async (filePath: string): Promise<ProbeOutput> => {
  const { stdout } = await execFile(ffprobe.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath])
  return JSON.parse(stdout) as ProbeOutput
}
