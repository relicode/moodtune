import { jwtVerify, SignJWT, type JWTPayload } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

import { COOKIE_NAME, COOKIE_OPTIONS, JWT_ALGORITHM, SESSION_EXPIRATION, getSecret } from '$/lib/jwt'
import { createLogger } from '$/lib/logger'
import { getClientIp } from '$/lib/request'
import { UserRole } from '$/types'
import type { SessionPayload } from '$/types'

const log = createLogger('proxy')

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
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
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
  const ip = getClientIp(request.headers)
  const token = request.cookies.get(COOKIE_NAME)?.value

  const session = token ? await verifyToken(token) : null

  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== UserRole.ADMIN) {
      log.warn({ pathname, ip }, 'unauthorized access to admin route')
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname.startsWith('/venue/')) {
    if (!session) {
      log.warn({ pathname, ip }, 'unauthenticated access to venue route')
      return NextResponse.redirect(new URL('/', request.url))
    }

    const venueId = pathname.split('/')[2]
    if (session.role !== UserRole.ADMIN && !session.venueIds?.includes(venueId)) {
      log.warn({ pathname, userId: session.userId, ip }, 'forbidden access to venue route')
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const response = NextResponse.next()

  if (session && shouldRefresh(session)) {
    log.debug({ userId: session.userId }, 'refreshing session token')
    const newToken = await refreshToken(session)
    response.cookies.set(COOKIE_NAME, newToken, COOKIE_OPTIONS)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/venue/:path*'],
}

export default proxy
