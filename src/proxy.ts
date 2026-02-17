import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

import type { SessionPayload } from '$/types'

const COOKIE_NAME = 'moodtune-session'
const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'change-me')

const verifyToken = async (token: string): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value

  const session = token ? await verifyToken(token) : null

  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }

  if (pathname.startsWith('/venue/')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const venueId = pathname.split('/')[2]
    if (session.role !== 'admin' && !session.venueIds?.includes(venueId)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/venue/:path*'],
}

export default proxy
