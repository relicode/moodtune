import { createLogger } from '$/lib/logger'
import { getSessionFromCookie } from '$/lib/session'

const log = createLogger('analytics')

const ALLOWED_EVENTS = new Set(['track-play', 'track-complete', 'track-skip'])
const MAX_STRING_LEN = 200

const truncate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  return value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) : value
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

export const POST = async (request: Request) => {
  const session = await getSessionFromCookie()
  if (!session) {
    return new Response(null, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }

  const event = body.event as string | undefined
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response(null, { status: 400 })
  }

  log.info(
    {
      event,
      userId: session.userId,
      username: session.username,
      playlistId: truncate(body.playlistId),
      playlistName: truncate(body.playlistName),
      trackId: truncate(body.trackId),
      trackName: truncate(body.trackName),
      artist: truncate(body.artist),
      trackDuration: toNumber(body.trackDuration),
      listenedDuration: toNumber(body.listenedDuration),
    },
    `analytics: ${event}`
  )

  return new Response(null, { status: 204 })
}
