import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

import { createBranch } from '$/data/branches'
import { AUDIO_BUCKET, uploadFile } from '$/data/minio'
import { addTrackToBranch, createTrack } from '$/data/tracks'
import { addRootBranch, createVenue, deleteVenue } from '$/data/venues'
import { adminCookie, API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

const venueIds: string[] = []

afterAll(async () => {
  for (const id of venueIds) {
    await deleteVenue(id).catch(() => {})
  }
})

const setupAudioTrack = async () => {
  const venue = await createVenue(`Audio Test Venue ${crypto.randomUUID().slice(0, 8)}`, 'audio stream tests')
  venueIds.push(venue.id)
  const branch = await createBranch(venue.id, null, 'Test Playlist', 'playlist', null)
  await addRootBranch(venue.id, branch.id)

  const fileName = `test-stream-${crypto.randomUUID()}.opus`
  const audioPath = resolve(__dirname, '../test-data/test-audio.opus')
  const audioBuffer = await readFile(audioPath)
  await uploadFile(AUDIO_BUCKET, fileName, Buffer.from(audioBuffer), 'audio/opus')

  const track = await createTrack('Stream Test', 'Stream Artist', fileName, 10)
  await addTrackToBranch(branch.id, track.id)

  return { venue, branch, track, audioSize: audioBuffer.length }
}

describe('GET /api/audio/[branchId]/[trackId]', () => {
  it('admin gets full audio stream', async () => {
    const { branch, track, audioSize } = await setupAudioTrack()

    const res = await fetchApi(`/api/audio/${branch.id}/${track.id}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/opus')
    expect(res.headers.get('accept-ranges')).toBe('bytes')

    const body = await res.arrayBuffer()
    expect(body.byteLength).toBe(audioSize)
  })

  it('admin gets partial content with Range header', async () => {
    const { branch, track, audioSize } = await setupAudioTrack()
    const cookie = await adminCookie()

    const res = await fetch(`${API_BASE}/api/audio/${branch.id}/${track.id}`, {
      headers: { cookie, range: 'bytes=0-99' },
    })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe(`bytes 0-99/${audioSize}`)
    expect(res.headers.get('accept-ranges')).toBe('bytes')

    const body = await res.arrayBuffer()
    expect(body.byteLength).toBe(100)
  })

  it('user with venue access gets audio', async () => {
    const { venue, branch, track } = await setupAudioTrack()
    const cookie = await userCookie([venue.id])

    const res = await fetch(`${API_BASE}/api/audio/${branch.id}/${track.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(200)
  })

  it('user without venue access gets 403', async () => {
    const { branch, track } = await setupAudioTrack()
    const cookie = await userCookie([])

    const res = await fetch(`${API_BASE}/api/audio/${branch.id}/${track.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(403)
  })

  it('no cookie returns 401', async () => {
    const { branch, track } = await setupAudioTrack()

    const res = await fetchApiUnauthed(`/api/audio/${branch.id}/${track.id}`)
    expect(res.status).toBe(401)
  })

  it('track not in branch returns 404', async () => {
    const { branch } = await setupAudioTrack()
    // Create a track not added to the branch
    const orphan = await createTrack('Orphan', 'Artist', 'orphan.opus', 5)

    const res = await fetchApi(`/api/audio/${branch.id}/${orphan.id}`)
    expect(res.status).toBe(404)
  })

  it('nonexistent trackId returns 404', async () => {
    const { branch } = await setupAudioTrack()

    const res = await fetchApi(`/api/audio/${branch.id}/nonexistent-track-id`)
    expect(res.status).toBe(404)
  })

  it('nonexistent branchId returns 404', async () => {
    const { track } = await setupAudioTrack()

    const res = await fetchApi(`/api/audio/nonexistent-branch-id/${track.id}`)
    expect(res.status).toBe(404)
  })
})
