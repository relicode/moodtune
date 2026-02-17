import { SignJWT } from 'jose'

// Avoid `BASE_URL` — Vite reserves it and sets it to '/'
export const API_BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

const signToken = async (payload: Record<string, unknown>) => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is not set')
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(secret)
}

export const adminCookie = async () => {
  const token = await signToken({ userId: 'test-admin', username: 'test-admin', role: 'admin', venueIds: [] })
  return `moodtune-session=${token}`
}

export const userCookie = async (venueIds: string[] = []) => {
  const token = await signToken({ userId: 'test-user', username: 'test-user', role: 'user', venueIds })
  return `moodtune-session=${token}`
}

export const fetchApi = async (path: string, options: RequestInit = {}) => {
  const cookie = await adminCookie()
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      cookie,
      ...options.headers,
    },
  })
}

export const fetchApiUnauthed = async (path: string, options: RequestInit = {}) => fetch(`${API_BASE}${path}`, options)
