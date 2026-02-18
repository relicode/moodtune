import 'server-only'

import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

const execFile = promisify(execFileCb)

// Use FFPROBE_BIN env var if set (e.g. system-installed ffprobe on ARM),
// otherwise fall back to ffprobe-static's bundled binary
const ffprobePath = process.env.FFPROBE_BIN ?? require('ffprobe-static').path

export type AudioMetadata = {
  duration: number
  title: string | null
  artist: string | null
  genre: string | null
}

export const extractMetadata = async (filePath: string): Promise<AudioMetadata> => {
  const data = await probe(filePath)
  const tags = data.format?.tags ?? {}
  const duration = parseFloat(data.format?.duration ?? '')

  if (!duration || isNaN(duration)) throw new Error('Could not extract duration from audio file')

  return {
    duration,
    title: tags.title ?? tags.TITLE ?? null,
    artist: tags.artist ?? tags.ARTIST ?? tags.album_artist ?? tags.ALBUM_ARTIST ?? null,
    genre: tags.genre ?? tags.GENRE ?? null,
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
  const { stdout } = await execFile(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath])
  return JSON.parse(stdout) as ProbeOutput
}
