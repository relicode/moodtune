export const COOKIE_NAME = 'moodtune-session'
export const JWT_ALGORITHM = 'HS256'
export const SESSION_EXPIRATION = '12h'
export const SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours — must match SESSION_EXPIRATION
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE,
  path: '/',
}

let cachedSecret: Uint8Array | undefined

export const getSecret = () => {
  if (cachedSecret) return cachedSecret
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  cachedSecret = new TextEncoder().encode(secret)
  return cachedSecret
}
