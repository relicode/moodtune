import { NextResponse } from 'next/server'

import { AUDIO_BUCKET, uploadFile } from '$/data/minio'
import { addTrackToBranch, createTrack } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const branchId = formData.get('branchId') as string
  const title = formData.get('title') as string
  const artist = (formData.get('artist') as string) || ''
  const duration = parseFloat(formData.get('duration') as string) || 0
  const audioFile = formData.get('audio') as File | null

  if (!branchId || !title || !audioFile || audioFile.size === 0) {
    return NextResponse.json({ error: 'branchId, title, and audio file are required' }, { status: 400 })
  }

  const ext = audioFile.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await audioFile.arrayBuffer())
  await uploadFile(AUDIO_BUCKET, fileName, buffer, audioFile.type)

  const track = await createTrack(title, artist, fileName, duration)
  await addTrackToBranch(branchId, track.id)

  return NextResponse.json({ success: true })
}
