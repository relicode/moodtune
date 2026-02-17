import { afterAll, describe, expect, it } from 'vitest'

import {
  addChildBranch,
  createBranch,
  deleteBranchRecursive,
  getBranch,
  getChildBranches,
  updateBranch,
} from '$/data/branches'
import { AUDIO_BUCKET, getObjectMetadata, IMAGE_BUCKET, uploadFile } from '$/data/minio'
import redis from '$/data/redis'
import { addTrackToBranch, createTrack, getTrack } from '$/data/tracks'
import { addRootBranch, createVenue, deleteVenue, getRootBranchIds } from '$/data/venues'
import { API_BASE, fetchApi, fetchApiUnauthed, userCookie } from './helpers'

const venueIds: string[] = []

afterAll(async () => {
  for (const id of venueIds) {
    await deleteVenue(id).catch(() => {})
  }
})

const setupVenue = async () => {
  const venue = await createVenue(`Branch Test Venue ${crypto.randomUUID().slice(0, 8)}`, 'branch tests')
  venueIds.push(venue.id)
  return venue
}

describe('branches — data layer', () => {
  it('create root branch', async () => {
    const venue = await setupVenue()
    const branch = await createBranch(venue.id, null, 'Root', 'folder', null)
    await addRootBranch(venue.id, branch.id)

    const rootIds = await getRootBranchIds(venue.id)
    expect(rootIds).toContain(branch.id)

    const fetched = await getBranch(branch.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.name).toBe('Root')
    expect(fetched!.type).toBe('folder')
    expect(fetched!.parentId).toBeNull()
  })

  it('create child branch', async () => {
    const venue = await setupVenue()
    const parent = await createBranch(venue.id, null, 'Parent', 'folder', null)
    await addRootBranch(venue.id, parent.id)

    const child = await createBranch(venue.id, parent.id, 'Child', 'playlist', null)
    await addChildBranch(parent.id, child.id)

    const children = await getChildBranches(parent.id)
    expect(children).toHaveLength(1)
    expect(children[0].id).toBe(child.id)
    expect(children[0].parentId).toBe(parent.id)
  })

  it('update branch', async () => {
    const venue = await setupVenue()
    const branch = await createBranch(venue.id, null, 'Old Name', 'folder', null)

    await updateBranch(branch.id, { name: 'New Name' })
    const fetched = await getBranch(branch.id)
    expect(fetched!.name).toBe('New Name')
  })

  it('delete leaf branch', async () => {
    const venue = await setupVenue()
    const branch = await createBranch(venue.id, null, 'Leaf', 'playlist', null)

    await deleteBranchRecursive(branch.id)
    expect(await getBranch(branch.id)).toBeNull()
  })

  it('delete recursive', async () => {
    const venue = await setupVenue()

    // Build: folder → folder → playlist with track + images
    const root = await createBranch(venue.id, null, 'Root', 'folder', null)
    await addRootBranch(venue.id, root.id)

    const mid = await createBranch(venue.id, root.id, 'Mid', 'folder', null)
    await addChildBranch(root.id, mid.id)

    const imagePath = `test-branch-${root.id}.jpg`
    const leaf = await createBranch(venue.id, mid.id, 'Leaf', 'playlist', imagePath)
    await addChildBranch(mid.id, leaf.id)

    await uploadFile(IMAGE_BUCKET, imagePath, Buffer.from('fake-image'), 'image/jpeg')

    const audioFile = `test-branch-${root.id}.opus`
    await uploadFile(AUDIO_BUCKET, audioFile, Buffer.from('fake-audio'), 'audio/opus')
    const track = await createTrack('Branch Track', 'Artist', audioFile, 60)
    await addTrackToBranch(leaf.id, track.id)

    // Delete from root
    await deleteBranchRecursive(root.id)

    // All branches gone
    expect(await getBranch(root.id)).toBeNull()
    expect(await getBranch(mid.id)).toBeNull()
    expect(await getBranch(leaf.id)).toBeNull()

    // Track gone
    expect(await getTrack(track.id)).toBeNull()

    // Redis lists cleaned up
    expect(await redis.lrange(`branch:${root.id}:children`, 0, -1)).toEqual([])
    expect(await redis.lrange(`branch:${mid.id}:children`, 0, -1)).toEqual([])
    expect(await redis.lrange(`branch:${leaf.id}:tracks`, 0, -1)).toEqual([])

    // MinIO files gone
    await expect(getObjectMetadata(AUDIO_BUCKET, audioFile)).rejects.toThrow()
    await expect(getObjectMetadata(IMAGE_BUCKET, imagePath)).rejects.toThrow()
  })
})

describe('branches — HTTP routes', () => {
  it('GET /api/admin/branches/[venueId] returns root branches', async () => {
    const venue = await setupVenue()
    const branch = await createBranch(venue.id, null, 'HTTP Root', 'folder', null)
    await addRootBranch(venue.id, branch.id)

    const res = await fetchApi(`/api/admin/branches/${venue.id}`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.branches).toBeInstanceOf(Array)
    const found = data.branches.find((b: { id: string }) => b.id === branch.id)
    expect(found).toBeDefined()
    expect(found.name).toBe('HTTP Root')
    expect(found.type).toBe('folder')
  })

  it('GET /api/admin/branches/[venueId]?parentId=X returns children', async () => {
    const venue = await setupVenue()
    const parent = await createBranch(venue.id, null, 'Parent', 'folder', null)
    await addRootBranch(venue.id, parent.id)

    const child = await createBranch(venue.id, parent.id, 'Child', 'playlist', null)
    await addChildBranch(parent.id, child.id)

    const res = await fetchApi(`/api/admin/branches/${venue.id}?parentId=${parent.id}`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.branches).toHaveLength(1)
    expect(data.branches[0].id).toBe(child.id)
  })

  it('GET /api/admin/branches/[venueId] without cookie returns 401', async () => {
    const venue = await setupVenue()
    const res = await fetchApiUnauthed(`/api/admin/branches/${venue.id}`)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/branches/[venueId] with user cookie returns 401', async () => {
    const venue = await setupVenue()
    const cookie = await userCookie()
    const res = await fetch(`${API_BASE}/api/admin/branches/${venue.id}`, {
      headers: { cookie },
    })
    expect(res.status).toBe(401)
  })
})
