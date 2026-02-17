import { afterAll, describe, expect, it } from 'vitest'

import redis from '$/data/redis'
import { createUser, deleteUser, getUserById, getUserByUsername } from '$/data/users'
import {
  addUserToVenue,
  createVenue,
  deleteVenue,
  getVenueUserIds,
  isUserInVenue,
  removeUserFromVenue,
} from '$/data/venues'
import { API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

const venueIds: string[] = []
const userIds: string[] = []

afterAll(async () => {
  for (const id of userIds) {
    await deleteUser(id).catch(() => {})
  }
  for (const id of venueIds) {
    await deleteVenue(id).catch(() => {})
  }
})

const uniqueUsername = () => `test-user-${crypto.randomUUID().slice(0, 8)}`

describe('users — data layer', () => {
  it('create user', async () => {
    const username = uniqueUsername()
    const user = await createUser(username, 'password123', 'user')
    userIds.push(user.id)

    const fetched = await getUserById(user.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.username).toBe(username)
    expect(fetched!.role).toBe('user')
    expect(fetched!.createdAt).toBeTruthy()
  })

  it('getUserByUsername', async () => {
    const username = uniqueUsername()
    const user = await createUser(username, 'password123', 'user')
    userIds.push(user.id)

    const fetched = await getUserByUsername(username)
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(user.id)
  })

  it('duplicate username throws', async () => {
    const username = uniqueUsername()
    const user = await createUser(username, 'password123', 'user')
    userIds.push(user.id)

    await expect(createUser(username, 'other-password', 'user')).rejects.toThrow('already taken')
  })

  it('delete user', async () => {
    const username = uniqueUsername()
    const user = await createUser(username, 'password123', 'user')
    // Don't push to userIds since we delete manually

    await deleteUser(user.id)
    expect(await getUserById(user.id)).toBeNull()
    expect(await getUserByUsername(username)).toBeNull()
    expect(await redis.get(`user:byUsername:${username}`)).toBeNull()
  })

  it('venue assignment', async () => {
    const venue = await createVenue('User Venue', 'user venue test')
    venueIds.push(venue.id)
    const user = await createUser(uniqueUsername(), 'password123', 'user')
    userIds.push(user.id)

    await addUserToVenue(venue.id, user.id)
    expect(await isUserInVenue(venue.id, user.id)).toBe(true)

    const userIdsInVenue = await getVenueUserIds(venue.id)
    expect(userIdsInVenue).toContain(user.id)
  })

  it('venue removal', async () => {
    const venue = await createVenue('Removal Venue', 'removal test')
    venueIds.push(venue.id)
    const user = await createUser(uniqueUsername(), 'password123', 'user')
    userIds.push(user.id)

    await addUserToVenue(venue.id, user.id)
    await removeUserFromVenue(venue.id, user.id)
    expect(await isUserInVenue(venue.id, user.id)).toBe(false)
  })
})

describe('users — HTTP routes', () => {
  it('GET /api/admin/venue-users/[venueId] returns users without passwordHash', async () => {
    const venue = await createVenue('HTTP User Venue', 'http test')
    venueIds.push(venue.id)
    const username = uniqueUsername()
    const user = await createUser(username, 'password123', 'user')
    userIds.push(user.id)
    await addUserToVenue(venue.id, user.id)

    const res = await fetchApi(`/api/admin/venue-users/${venue.id}`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.users).toBeInstanceOf(Array)
    const found = data.users.find((u: { id: string }) => u.id === user.id)
    expect(found).toBeDefined()
    expect(found.username).toBe(username)
    expect(found.role).toBe('user')
    expect(found.createdAt).toBeTruthy()
    expect(found.passwordHash).toBeUndefined()
  })

  it('GET /api/admin/venue-users/[venueId] without cookie returns 401', async () => {
    const venue = await createVenue('Unauthed User Venue', 'unauthed test')
    venueIds.push(venue.id)

    const res = await fetchApiUnauthed(`/api/admin/venue-users/${venue.id}`)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/venue-users/[venueId] with user cookie returns 401', async () => {
    const venue = await createVenue('User Role Venue', 'user role test')
    venueIds.push(venue.id)

    const cookie = await userCookie()
    const res = await fetch(`${API_BASE}/api/admin/venue-users/${venue.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(401)
  })
})
