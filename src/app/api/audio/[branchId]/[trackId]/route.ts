import { getBranch } from '$/data/branches'
import { listAll } from '$/data/dal'
import minioClient, { AUDIO_BUCKET } from '$/data/minio'
import { getTrack } from '$/data/tracks'
import { createLogger } from '$/lib/logger'
import { getSessionFromCookie } from '$/lib/session'
import { toReadableStream } from '$/lib/stream'
import { UserRole } from '$/types'

const log = createLogger('audio-stream')

export const GET = async (request: Request, { params }: { params: Promise<{ branchId: string; trackId: string }> }) => {
  const session = await getSessionFromCookie()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { branchId, trackId } = await params

  const branch = await getBranch(branchId)
  if (!branch) {
    return new Response('Not found', { status: 404 })
  }

  if (session.role === UserRole.USER && !session.venueIds.includes(branch.venueId)) {
    log.warn({ branchId, userId: session.userId, username: session.username }, 'forbidden audio stream access')
    return new Response('Forbidden', { status: 403 })
  }

  const track = await getTrack(trackId)
  if (!track) {
    return new Response('Not found', { status: 404 })
  }

  const [trackIds, randomTrackIds] = await Promise.all([
    listAll(`branch:${branchId}:tracks`),
    listAll(`branch:${branchId}:randomTracks`),
  ])
  if (!trackIds.includes(trackId) && !randomTrackIds.includes(trackId)) {
    return new Response('Not found', { status: 404 })
  }

  const stat = await minioClient.statObject(AUDIO_BUCKET, track.fileName)
  const fileSize = stat.size
  const contentType = stat.metaData?.['content-type'] || 'application/octet-stream'

  const rangeHeader = request.headers.get('range')

  if (!rangeHeader) {
    const stream = await minioClient.getObject(AUDIO_BUCKET, track.fileName)
    return new Response(toReadableStream(stream), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  }

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (!match) {
    log.warn({ branchId, trackId, rangeHeader }, 'invalid range header')
    return new Response('Invalid range', {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    })
  }

  const start = parseInt(match[1], 10)
  const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1

  if (start >= fileSize || start > end) {
    return new Response('Range not satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    })
  }

  const length = end - start + 1

  const stream = await minioClient.getPartialObject(AUDIO_BUCKET, track.fileName, start, length)
  return new Response(toReadableStream(stream), {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    },
  })
}
