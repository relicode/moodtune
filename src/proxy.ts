import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

import { UserRole } from '$/types'
import type { SessionPayload } from '$/types'

const COOKIE_NAME = 'moodtune-session'
const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'change-me')

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

const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl
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
  matcher: ['/admin/:path*', '/venue/:path*'],
}

export default proxy
