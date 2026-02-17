import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { NextResponse } from 'next/server'

import { AUDIO_BUCKET, removeFile, uploadFile } from '$/data/minio'
import { addRandomTrackToBranch, addTrackToBranch, createTrack } from '$/data/tracks'
import { compressToM4a, TARGET_BYTES_PER_SEC } from '$/lib/ffmpeg'
import type { AudioMetadata } from '$/lib/ffprobe'
import { extractMetadata } from '$/lib/ffprobe'
import { parseFilename, sanitizeExtension } from '$/lib/filename'
import { getSessionFromCookie } from '$/lib/session'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
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
    return NextResponse.json({ error: 'branchId and audio file are required' }, { status: 400 })
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 100 MB limit' }, { status: 413 })
  }

  const ext = sanitizeExtension(audioFile.name)
  const originalFileName = `audio/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await audioFile.arrayBuffer())

  const tmpFile = join(tmpdir(), `moodtune-${crypto.randomUUID()}`)
  await writeFile(tmpFile, buffer, { mode: 0o600 })

  try {
    let meta: AudioMetadata
    try {
      meta = await extractMetadata(tmpFile)
    } catch {
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
    const shouldCompress = buffer.length > estimatedM4aSize * 1.2

    const uploadBuffer = shouldCompress ? await compressToM4a(tmpFile) : buffer
    const uploadFileName = shouldCompress ? `audio/${crypto.randomUUID()}.m4a` : originalFileName
    const contentType = shouldCompress ? 'audio/mp4' : audioFile.type

    await uploadFile(AUDIO_BUCKET, uploadFileName, uploadBuffer, contentType)

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

    return NextResponse.json({ success: true })
  } finally {
    await unlink(tmpFile).catch(() => {})
  }
}
