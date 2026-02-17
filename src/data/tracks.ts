import 'server-only'

import type { Track } from '$/types'
import { hashCreate, hashGet, listGetAll, listPush, listRemove } from './dal'
import { AUDIO_BUCKET, getPresignedUrl as getMinioPresignedUrl, removeFile } from './minio'
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

export const getBranchTracks = async (branchId: string): Promise<Track[]> =>
  listGetAll(`branch:${branchId}:tracks`, getTrack)

export const getTrackPresignedUrl = async (fileName: string) => getMinioPresignedUrl(AUDIO_BUCKET, fileName)

export const deleteTrack = async (id: string) => {
  const track = await getTrack(id)
  if (!track) return

  await removeFile(AUDIO_BUCKET, track.fileName)
  await redis.del(`track:${id}`)
}
