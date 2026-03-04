import { createLogger } from '$/lib/logger'
import { getSessionFromCookie } from '$/lib/session'

const log = createLogger('analytics')

const ALLOWED_EVENTS = new Set([
  'admin-branch-create',
  'admin-branch-delete',
  'admin-branch-update',
  'admin-playlist-update',
  'admin-track-delete',
  'admin-track-update',
  'admin-track-upload',
  'admin-user-create',
  'admin-user-delete',
  'admin-venue-create',
  'admin-venue-delete',
  'admin-venue-update',
  'auth-login-failure',
  'auth-logout',
  'pwa-install-prompt',
  'pwa-installed',
  'track-complete',
  'track-pause',
  'track-play',
  'track-skip',
])

const MAX_STRING_LEN = 200

const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'event') continue
    if (typeof value === 'string') {
      result[key] = value.length > MAX_STRING_LEN ? value.slice(0, MAX_STRING_LEN) : value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value
    } else if (typeof value === 'boolean') {
      result[key] = value
    }
  }
  return result
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

  const event = body.event
  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) {
    return new Response(null, { status: 400 })
  }

  log.info(
    {
      event,
      userId: session.userId,
      username: session.username,
      ...sanitize(body),
    },
    `analytics: ${event}`
  )

  return new Response(null, { status: 204 })
}
