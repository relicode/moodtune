import { NextResponse } from 'next/server'

import { AUDIO_BUCKET, removeFile, uploadFile } from '$/data/minio'
import { addTrackToBranch, createTrack } from '$/data/tracks'
import type { AudioMetadata } from '$/lib/ffprobe'
import { extractMetadata } from '$/lib/ffprobe'
import { parseFilename } from '$/lib/filename'
import { getSessionFromCookie } from '$/lib/session'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const sanitizeExtension = (name: string): string => {
  const ext = name.split('.').pop() ?? ''
  return ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
}

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

  if (!branchId || !audioFile || audioFile.size === 0) {
    return NextResponse.json({ error: 'branchId and audio file are required' }, { status: 400 })
  }

  if (audioFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 100 MB limit' }, { status: 413 })
  }

  const ext = sanitizeExtension(audioFile.name)
  const fileName = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await audioFile.arrayBuffer())

  let meta: AudioMetadata
  try {
    meta = await extractMetadata(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not read audio metadata — unsupported or corrupt file' }, { status: 422 })
  }

  const { artist: fileArtist, title: fileTitle } = parseFilename(audioFile.name)
  const title = formTitle || meta.title || fileTitle || 'Unknown Track'
  const artist = formArtist || meta.artist || fileArtist || 'Unknown Artist'

  await uploadFile(AUDIO_BUCKET, fileName, buffer, audioFile.type, { duration: String(meta.duration) })

  try {
    const track = await createTrack(title, artist, fileName, meta.duration)
    await addTrackToBranch(branchId, track.id)
  } catch {
    await removeFile(AUDIO_BUCKET, fileName).catch(() => {})
    return NextResponse.json({ error: 'Failed to save track record' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
