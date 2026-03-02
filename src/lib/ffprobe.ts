import 'server-only'

import { execFile as execFileCb } from 'child_process'
import { promisify } from 'util'

import { createLogger } from '$/lib/logger'
import { getFfprobePath } from '$/lib/paths'

const execFile = promisify(execFileCb)
const log = createLogger('ffprobe')

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

  const metadata = {
    duration,
    title: tags.title ?? tags.TITLE ?? null,
    artist: tags.artist ?? tags.ARTIST ?? tags.album_artist ?? tags.ALBUM_ARTIST ?? null,
    genre: tags.genre ?? tags.GENRE ?? null,
  }
  log.debug({ metadata }, 'extracted metadata')
  return metadata
}

type FormatTags = Record<string, string | undefined>

type ProbeOutput = {
  format?: {
    duration?: string
    tags?: FormatTags
  }
}

const probe = async (filePath: string): Promise<ProbeOutput> => {
  const { stdout } = await execFile(getFfprobePath(), [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    filePath,
  ])
  return JSON.parse(stdout) as ProbeOutput
}
