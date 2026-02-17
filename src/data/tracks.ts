import 'server-only'

import type { Track } from '$/types'
import { hashCreate, hashGet, hashSet, listGetAll, listPush, listRemove } from './dal'
import { AUDIO_BUCKET, removeFile } from './minio'
import redis from './redis'

const schema = { duration: 'number' } as const

export const createTrack = async (title: string, artist: string, fileName: string, duration: number): Promise<Track> =>
  hashCreate<Track>('track', { title, artist, fileName, duration }, schema)

export const getTrack = async (id: string): Promise<Track | null> => hashGet<Track>(`track:${id}`, schema)

export const addTrackToBranch = async (branchId: string, trackId: string) => {
  await listPush(`branch:${branchId}:tracks`, trackId)
}

export const removeTrackFromBranch = async (branchId: string, trackId: string) => {
  await listRemove(`branch:${branchId}:tracks`, trackId)
}

export const getPlaylistTracks = async (branchId: string): Promise<Track[]> =>
  listGetAll(`branch:${branchId}:tracks`, getTrack)

export const addRandomTrackToBranch = async (branchId: string, trackId: string) => {
  await listPush(`branch:${branchId}:randomTracks`, trackId)
}

export const removeRandomTrackFromBranch = async (branchId: string, trackId: string) => {
  await listRemove(`branch:${branchId}:randomTracks`, trackId)
}

export const getRandomTracks = async (branchId: string): Promise<Track[]> =>
  listGetAll(`branch:${branchId}:randomTracks`, getTrack)

export const updateTrack = async (id: string, fields: Partial<Pick<Track, 'title' | 'artist'>>) => {
  await hashSet(`track:${id}`, fields, schema)
}

export const deleteTrack = async (id: string) => {
  const track = await getTrack(id)
  if (!track) return

  await removeFile(AUDIO_BUCKET, track.fileName)
  await redis.del(`track:${id}`)
}
