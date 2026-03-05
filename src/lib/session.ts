import 'server-only'

import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

import { COOKIE_NAME, COOKIE_OPTIONS, JWT_ALGORITHM, SESSION_EXPIRATION, getSecret } from '$/lib/jwt'
import { createLogger } from '$/lib/logger'
import type { SessionPayload } from '$/types'

const log = createLogger('session')

export const createSession = async (payload: SessionPayload): Promise<string> =>
  new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getSecret())

export const verifySession = async (token: string): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    log.warn('JWT verification failed')
    return null
  }
}

export const setSessionCookie = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export const getSessionFromCookie = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export const deleteSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
