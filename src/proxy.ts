import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

import { UserRole } from '$/types'
import type { SessionPayload } from '$/types'

const COOKIE_NAME = 'moodtune-session'
const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'change-me')

// ── Login rate limiting ──────────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_MAX_IPS = 10_000
const CLEANUP_INTERVAL_MS = 60 * 1000

const attempts = new Map<string, number[]>()
const state = { lastCleanup: Date.now() }

const cleanupStaleEntries = () => {
  const now = Date.now()
  if (now - state.lastCleanup < CLEANUP_INTERVAL_MS) return
  state.lastCleanup = now
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  for (const [ip, timestamps] of attempts) {
    const fresh = timestamps.filter((t) => t > cutoff)
    if (fresh.length === 0) {
      attempts.delete(ip)
    } else {
      attempts.set(ip, fresh)
    }
  }
}

const isRateLimited = (ip: string): boolean => {
  cleanupStaleEntries()
  if (attempts.size >= RATE_LIMIT_MAX_IPS && !attempts.has(ip)) return true
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (attempts.get(ip) ?? []).filter((t) => t > cutoff)
  timestamps.push(now)
  attempts.set(ip, timestamps)
  return timestamps.length > RATE_LIMIT_MAX
}

// ── JWT helpers ──────────────────────────────────────────────────────────────
const verifyToken = async (token: string): Promise<(SessionPayload & JWTPayload) | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload & JWTPayload
  } catch {
    return null
  }
}

const refreshToken = async (session: SessionPayload & JWTPayload): Promise<string> => {
  const { iat: _iat, exp: _exp, nbf: _nbf, jti: _jti, ...payload } = session
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecret())
}

const shouldRefresh = (session: SessionPayload & JWTPayload): boolean => {
  if (!session.iat || !session.exp) return false
  const elapsed = Math.floor(Date.now() / 1000) - session.iat
  const lifetime = session.exp - session.iat
  return elapsed > lifetime / 2
}

// ── Middleware ────────────────────────────────────────────────────────────────
const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  // Rate limit login attempts (POST to / triggers the login server action)
  if (pathname === '/' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '900' },
      })
    }
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  const session = token ? await verifyToken(token) : null

  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname.startsWith('/venue/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const venueId = pathname.split('/')[2]
    if (session.role !== UserRole.ADMIN && !session.venueIds?.includes(venueId)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const response = NextResponse.next()

  if (session && shouldRefresh(session)) {
    const newToken = await refreshToken(session)
    response.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/', '/admin/:path*', '/venue/:path*'],
}

export default proxy
