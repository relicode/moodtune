import { afterAll, describe, expect, it } from 'vitest'

import { createBranch } from '$/data/branches'
import { addTrackToBranch, createTrack } from '$/data/tracks'
import { addRootBranch, createVenue, deleteVenue } from '$/data/venues'
import { API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

const venueIds: string[] = []

afterAll(async () => {
  for (const id of venueIds) {
    await deleteVenue(id).catch(() => {})
  }
})

const setupPlaylist = async () => {
  const venue = await createVenue(`Playlist Test Venue ${crypto.randomUUID().slice(0, 8)}`, 'playlist tests')
  venueIds.push(venue.id)
  const branch = await createBranch(venue.id, null, 'Test Playlist', 'playlist', null)
  await addRootBranch(venue.id, branch.id)
  const track = await createTrack('Test Title', 'Test Artist', `test-${crypto.randomUUID()}.opus`, 120.5)
  await addTrackToBranch(branch.id, track.id)
  return { venue, branch, track }
}

describe('GET /api/playlist/[playlistId]', () => {
  it('admin gets full metadata', async () => {
    const { branch, track } = await setupPlaylist()

    const res = await fetchApi(`/api/playlist/${branch.id}`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.tracks).toBeInstanceOf(Array)
    expect(data.tracks).toHaveLength(1)

    const t = data.tracks[0]
    expect(t.url).toBe(`/api/audio/${branch.id}/${track.id}`)
    expect(t.id).toBe(track.id)
    expect(t.title).toBe('Test Title')
    expect(t.artist).toBe('Test Artist')
    expect(t.duration).toBe(120.5)
    expect(t.createdAt).toEqual(expect.any(String))
    expect(t.fileName).toBeUndefined()
  })

  it('user with venue access gets only url and duration', async () => {
    const { venue, branch } = await setupPlaylist()
    const cookie = await userCookie([venue.id])

    const res = await fetch(`${API_BASE}/api/playlist/${branch.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.tracks).toHaveLength(1)

    const t = data.tracks[0]
    expect(t.url).toMatch(/^\/api\/audio\//)
    expect(t.duration).toBe(120.5)
    expect(Object.keys(t)).toEqual(['url', 'duration'])
  })

  it('user without venue access gets 403', async () => {
    const { branch } = await setupPlaylist()
    const cookie = await userCookie([])

    const res = await fetch(`${API_BASE}/api/playlist/${branch.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(403)
  })

  it('no cookie returns 401', async () => {
    const { branch } = await setupPlaylist()
    const res = await fetchApiUnauthed(`/api/playlist/${branch.id}`)
    expect(res.status).toBe(401)
  })

  it('folder branch returns 404', async () => {
    const venue = await createVenue(`Folder Test Venue ${crypto.randomUUID().slice(0, 8)}`, 'folder test')
    venueIds.push(venue.id)
    const folder = await createBranch(venue.id, null, 'A Folder', 'folder', null)
    await addRootBranch(venue.id, folder.id)

    const res = await fetchApi(`/api/playlist/${folder.id}`)
    expect(res.status).toBe(404)
  })

  it('nonexistent id returns 404', async () => {
    const res = await fetchApi('/api/playlist/nonexistent-id-123')
    expect(res.status).toBe(404)
  })
})
