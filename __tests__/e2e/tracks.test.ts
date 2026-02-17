import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

import { createBranch } from '$/data/branches'
import { AUDIO_BUCKET, getObjectMetadata, uploadFile } from '$/data/minio'
import {
  addTrackToBranch,
  createTrack,
  deleteTrack,
  getPlaylistTracks,
  getTrack,
  removeTrackFromBranch,
  updateTrack,
} from '$/data/tracks'
import { addRootBranch, createVenue, deleteVenue } from '$/data/venues'
import { API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

const venueIds: string[] = []

afterAll(async () => {
  for (const id of venueIds) {
    await deleteVenue(id).catch(() => {})
  }
})

const setupVenueWithBranch = async () => {
  const venue = await createVenue(`Track Test Venue ${crypto.randomUUID().slice(0, 8)}`, 'track tests')
  venueIds.push(venue.id)
  const branch = await createBranch(venue.id, null, 'Playlist', 'playlist', null)
  await addRootBranch(venue.id, branch.id)
  return { venue, branch }
}

describe('tracks — data layer', () => {
  it('create track', async () => {
    const { branch } = await setupVenueWithBranch()
    const track = await createTrack('Test Title', 'Test Artist', 'test-file.opus', 180.5)
    await addTrackToBranch(branch.id, track.id)

    const fetched = await getTrack(track.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.title).toBe('Test Title')
    expect(fetched!.artist).toBe('Test Artist')
    expect(fetched!.fileName).toBe('test-file.opus')
    expect(typeof fetched!.duration).toBe('number')
    expect(fetched!.duration).toBe(180.5)
  })

  it('add to branch', async () => {
    const { branch } = await setupVenueWithBranch()
    const track = await createTrack('Add Track', 'Artist', 'add-file.opus', 60)
    await addTrackToBranch(branch.id, track.id)

    const tracks = await getPlaylistTracks(branch.id)
    const found = tracks.find((t) => t.id === track.id)
    expect(found).toBeDefined()
  })

  it('remove from branch', async () => {
    const { branch } = await setupVenueWithBranch()
    const track = await createTrack('Remove Track', 'Artist', 'remove-file.opus', 60)
    await addTrackToBranch(branch.id, track.id)

    await removeTrackFromBranch(branch.id, track.id)
    const tracks = await getPlaylistTracks(branch.id)
    const found = tracks.find((t) => t.id === track.id)
    expect(found).toBeUndefined()

    // Track itself still exists
    expect(await getTrack(track.id)).not.toBeNull()
  })

  it('update track', async () => {
    const track = await createTrack('Old Title', 'Old Artist', 'update-file.opus', 60)

    await updateTrack(track.id, { title: 'New Title', artist: 'New Artist' })
    const fetched = await getTrack(track.id)
    expect(fetched!.title).toBe('New Title')
    expect(fetched!.artist).toBe('New Artist')
  })

  it('delete track removes MinIO file', async () => {
    const fileName = `test-delete-${crypto.randomUUID()}.opus`
    await uploadFile(AUDIO_BUCKET, fileName, Buffer.from('fake-audio'), 'audio/opus')

    const track = await createTrack('Delete Me', 'Artist', fileName, 60)
    await deleteTrack(track.id)

    expect(await getTrack(track.id)).toBeNull()
    await expect(getObjectMetadata(AUDIO_BUCKET, fileName)).rejects.toThrow()
  })
})

describe('tracks — HTTP routes', () => {
  it('POST /api/admin/upload-track with valid audio', async () => {
    const { branch } = await setupVenueWithBranch()

    const audioPath = resolve(__dirname, '../test-data/test-audio.opus')
    const audioBuffer = await readFile(audioPath)

    const formData = new FormData()
    formData.set('branchId', branch.id)
    formData.set('audio', new File([audioBuffer], 'test-audio.opus', { type: 'audio/opus' }))

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify track appears in branch
    const tracks = await getPlaylistTracks(branch.id)
    expect(tracks.length).toBeGreaterThanOrEqual(1)
  })

  it('POST /api/admin/upload-track compresses WAV to M4A', async () => {
    const { branch } = await setupVenueWithBranch()

    const audioPath = resolve(__dirname, '../test-data/test-audio.wav')
    const audioBuffer = await readFile(audioPath)

    const formData = new FormData()
    formData.set('branchId', branch.id)
    formData.set('audio', new File([audioBuffer], 'test-audio.wav', { type: 'audio/wav' }))

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(200)

    const tracks = await getPlaylistTracks(branch.id)
    expect(tracks.length).toBe(1)
    expect(tracks[0].fileName).toMatch(/\.m4a$/)
  })

  it('POST /api/admin/upload-track skips compression for small files', async () => {
    const { branch } = await setupVenueWithBranch()

    const audioPath = resolve(__dirname, '../test-data/test-audio.opus')
    const audioBuffer = await readFile(audioPath)

    const formData = new FormData()
    formData.set('branchId', branch.id)
    formData.set('audio', new File([audioBuffer], 'test-audio.opus', { type: 'audio/opus' }))

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(200)

    const tracks = await getPlaylistTracks(branch.id)
    expect(tracks.length).toBe(1)
    expect(tracks[0].fileName).toMatch(/\.opus$/)
  })

  it('POST /api/admin/upload-track with corrupt file returns 422', async () => {
    const { branch } = await setupVenueWithBranch()
    const garbage = Buffer.from(crypto.getRandomValues(new Uint8Array(1024)))

    const formData = new FormData()
    formData.set('branchId', branch.id)
    formData.set('audio', new File([garbage], 'corrupt.mp3', { type: 'audio/mpeg' }))

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toMatch(/metadata/)
  })

  it('POST /api/admin/upload-track missing branchId returns 400', async () => {
    const audioPath = resolve(__dirname, '../test-data/test-audio.opus')
    const audioBuffer = await readFile(audioPath)

    const formData = new FormData()
    formData.set('audio', new File([audioBuffer], 'test-audio.opus', { type: 'audio/opus' }))

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(400)
  })

  it('POST /api/admin/upload-track missing audio returns 400', async () => {
    const { branch } = await setupVenueWithBranch()

    const formData = new FormData()
    formData.set('branchId', branch.id)

    const res = await fetchApi('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(400)
  })

  it('POST /api/admin/upload-track without cookie returns 401', async () => {
    const formData = new FormData()
    formData.set('branchId', 'fake')
    formData.set('audio', new File([Buffer.from('fake')], 'test.opus', { type: 'audio/opus' }))

    const res = await fetchApiUnauthed('/api/admin/upload-track', {
      method: 'POST',
      body: formData,
    })

    expect(res.status).toBe(401)
  })

  it('POST /api/admin/upload-track with user cookie returns 401', async () => {
    const cookie = await userCookie()
    const formData = new FormData()
    formData.set('branchId', 'fake')
    formData.set('audio', new File([Buffer.from('fake')], 'test.opus', { type: 'audio/opus' }))

    const res = await fetch(`${API_BASE}/api/admin/upload-track`, {
      method: 'POST',
      body: formData,
      headers: { cookie },
    })

    expect(res.status).toBe(401)
  })

  it('GET /api/admin/tracks/[branchId] returns tracks', async () => {
    const { branch } = await setupVenueWithBranch()
    const track = await createTrack('HTTP Track', 'HTTP Artist', 'http-file.opus', 90)
    await addTrackToBranch(branch.id, track.id)

    const res = await fetchApi(`/api/admin/tracks/${branch.id}`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.tracks).toBeInstanceOf(Array)
    const found = data.tracks.find((t: { id: string }) => t.id === track.id)
    expect(found).toBeDefined()
    expect(found.title).toBe('HTTP Track')
    expect(found.artist).toBe('HTTP Artist')
  })

  it('GET /api/admin/tracks/[branchId] without cookie returns 401', async () => {
    const res = await fetchApiUnauthed('/api/admin/tracks/fake-branch')
    expect(res.status).toBe(401)
  })
})
