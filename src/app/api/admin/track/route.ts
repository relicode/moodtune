import { unlink } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

import { AUDIO_BUCKET, removeFile, uploadFileFromPath } from '$/data/minio'
import { addRandomTrackToBranch, addTrackToBranch, createTrack } from '$/data/tracks'
import { compressToM4a, TARGET_BYTES_PER_SEC } from '$/lib/ffmpeg'
import type { AudioMetadata } from '$/lib/ffprobe'
import { extractMetadata } from '$/lib/ffprobe'
import { parseFilename, sanitizeExtension } from '$/lib/filename'
import { createLogger } from '$/lib/logger'
import { getTempDir } from '$/lib/paths'
import { getSessionFromCookie } from '$/lib/session'
import { streamToFile } from '$/lib/stream'
import { UserRole } from '$/types'

const log = createLogger('track-upload')

const MAX_FILE_SIZE = 2_147_483_648 // 2048 MB

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== UserRole.ADMIN) {
    log.warn('unauthorized track upload attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const branchId = formData.get('branchId') as string
  const formTitle = (formData.get('title') as string)?.trim() || ''
  const formArtist = (formData.get('artist') as string)?.trim() || ''
  const audioFile = formData.get('audio') as File | null
  const rawPool = (formData.get('pool') as string) || 'main'
  const pool: 'main' | 'random' = rawPool === 'random' ? 'random' : 'main'

  if (!branchId || !audioFile || audioFile.size === 0) {
    log.warn({ branchId }, 'track upload rejected — missing fields')
    return NextResponse.json({ error: 'branchId and audio file are required' }, { status: 400 })
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    log.warn({ branchId, size: audioFile.size }, 'track upload rejected — file too large')
    return NextResponse.json({ error: 'File size exceeds 2048 MB limit' }, { status: 413 })
  }

  const ext = sanitizeExtension(audioFile.name)
  const originalFileName = `audio/${crypto.randomUUID()}.${ext}`

  const tmpFile = join(getTempDir(), `moodtune-${crypto.randomUUID()}`)
  await streamToFile(audioFile.stream(), tmpFile)

  let compressedFile: string | null = null

  try {
    let meta: AudioMetadata
    try {
      meta = await extractMetadata(tmpFile)
    } catch {
      log.warn({ branchId, fileName: audioFile.name }, 'track upload rejected — unreadable metadata')
      return NextResponse.json(
        { error: 'Could not read audio metadata — unsupported or corrupt file' },
        { status: 422 }
      )
    }

    const { artist: fileArtist, title: fileTitle } = parseFilename(audioFile.name)
    const title = formTitle || meta.title || fileTitle || 'Unknown Track'
    const artist = formArtist || meta.artist || fileArtist || 'Unknown Artist'

    // Compress to M4A when at least 20% size reduction is expected
    const estimatedM4aSize = TARGET_BYTES_PER_SEC * meta.duration
    const shouldCompress = audioFile.size > estimatedM4aSize * 1.2

    let uploadFilePath: string
    let uploadFileName: string
    let contentType: string

    if (shouldCompress) {
      compressedFile = await compressToM4a(tmpFile)
      uploadFilePath = compressedFile
      uploadFileName = `audio/${crypto.randomUUID()}.m4a`
      contentType = 'audio/mp4'
    } else {
      uploadFilePath = tmpFile
      uploadFileName = originalFileName
      contentType = audioFile.type
    }

    await uploadFileFromPath(AUDIO_BUCKET, uploadFileName, uploadFilePath, contentType)

    try {
      const track = await createTrack(title, artist, uploadFileName, meta.duration)
      if (pool === 'random') {
        await addRandomTrackToBranch(branchId, track.id)
      } else {
        await addTrackToBranch(branchId, track.id)
      }
    } catch {
      await removeFile(AUDIO_BUCKET, uploadFileName).catch(() => {})
      return NextResponse.json({ error: 'Failed to save track record' }, { status: 500 })
    }

    log.info({ branchId, pool, title, artist, duration: meta.duration, compressed: shouldCompress }, 'track uploaded')
    return NextResponse.json({ success: true })
  } finally {
    await unlink(tmpFile).catch(() => {})
    if (compressedFile) await unlink(compressedFile).catch(() => {})
  }
}
