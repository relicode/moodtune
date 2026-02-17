import { afterAll, describe, expect, it } from 'vitest'

import { addChildBranch, createBranch, getBranch } from '$/data/branches'
import { AUDIO_BUCKET, getObjectMetadata, IMAGE_BUCKET, uploadFile } from '$/data/minio'
import redis from '$/data/redis'
import { addTrackToBranch, createTrack, getTrack } from '$/data/tracks'
import { createUser, getUserById } from '$/data/users'
import {
  addRootBranch,
  addUserToVenue,
  createVenue,
  deleteVenue,
  getAllVenues,
  getRootBranchIds,
  getVenue,
  updateVenue,
} from '$/data/venues'

const ids = {
  venues: [] as string[],
  users: [] as string[],
  branches: [] as string[],
  tracks: [] as string[],
  minioFiles: [] as { bucket: string; name: string }[],
}

afterAll(async () => {
  for (const id of ids.venues) {
    await deleteVenue(id).catch(() => {})
  }
  for (const id of ids.users) {
    const user = await getUserById(id)
    if (user) {
      await redis.del(`user:${id}`)
      await redis.del(`user:byUsername:${user.username}`)
    }
  }
  for (const id of ids.branches) {
    await redis.del(`branch:${id}`)
    await redis.del(`branch:${id}:children`)
    await redis.del(`branch:${id}:tracks`)
  }
  for (const id of ids.tracks) {
    await redis.del(`track:${id}`)
  }
})

describe('venues', () => {
  it('create', async () => {
    const venue = await createVenue('Test Venue', 'A test venue')
    ids.venues.push(venue.id)

    const fetched = await getVenue(venue.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('Test Venue')
    expect(fetched!.description).toBe('A test venue')
    expect(fetched!.createdAt).toBeTruthy()
  })

  it('update', async () => {
    const venue = await createVenue('Original Name', 'desc')
    ids.venues.push(venue.id)

    await updateVenue(venue.id, { name: 'Updated Name' })
    const fetched = await getVenue(venue.id)
    expect(fetched!.name).toBe('Updated Name')
  })

  it('getAllVenues', async () => {
    const venue = await createVenue('Listed Venue', 'should appear in list')
    ids.venues.push(venue.id)

    const all = await getAllVenues()
    const found = all.find((v) => v.id === venue.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Listed Venue')
  })

  it('delete', async () => {
    const venue = await createVenue('To Delete', 'will be deleted')
    // Don't push to ids.venues since we delete it manually
    await deleteVenue(venue.id)

    const fetched = await getVenue(venue.id)
    expect(fetched).toBeNull()
  })

  it('delete cascade', async () => {
    // 1. Setup: venue, user, branches, track, MinIO files
    const venue = await createVenue('Cascade Venue', 'cascade test')
    const venueId = venue.id

    const user = await createUser(`cascade-user-${venueId}`, 'password123', 'user')
    await addUserToVenue(venueId, user.id)

    const rootBranch = await createBranch(venueId, null, 'Root Folder', 'folder', null)
    await addRootBranch(venueId, rootBranch.id)

    const imagePath = `test-cascade-${venueId}.jpg`
    const childBranch = await createBranch(venueId, rootBranch.id, 'Child Playlist', 'playlist', imagePath)
    await addChildBranch(rootBranch.id, childBranch.id)

    // Upload a dummy image for the child branch
    await uploadFile(IMAGE_BUCKET, imagePath, Buffer.from('fake-image'), 'image/jpeg')

    const audioFileName = `test-cascade-${venueId}.opus`
    await uploadFile(AUDIO_BUCKET, audioFileName, Buffer.from('fake-audio'), 'audio/opus')

    const track = await createTrack('Cascade Track', 'Cascade Artist', audioFileName, 120)
    await addTrackToBranch(childBranch.id, track.id)

    // 2. Delete venue
    await deleteVenue(venueId)

    // 3. Assert everything is cleaned up
    expect(await getVenue(venueId)).toBeNull()
    expect(await getUserById(user.id)).toBeNull()
    expect(await redis.get(`user:byUsername:cascade-user-${venueId}`)).toBeNull()
    expect(await getBranch(rootBranch.id)).toBeNull()
    expect(await getBranch(childBranch.id)).toBeNull()
    expect(await getTrack(track.id)).toBeNull()
    expect(await getRootBranchIds(venueId)).toEqual([])

    // MinIO files should be gone
    await expect(getObjectMetadata(AUDIO_BUCKET, audioFileName)).rejects.toThrow()
    await expect(getObjectMetadata(IMAGE_BUCKET, imagePath)).rejects.toThrow()
  })
})
