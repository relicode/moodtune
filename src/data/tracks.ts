import 'server-only'

import type { Track } from '$/types'
import { AUDIO_BUCKET, getPresignedUrl as getMinioPresignedUrl, removeFile } from './minio'
import redis from './redis'

export const createTrack = async (
  title: string,
  artist: string,
  fileName: string,
  duration: number
): Promise<Track> => {
  const id = crypto.randomUUID()
  const track: Track = {
    id,
    title,
    artist,
    fileName,
    duration,
    createdAt: new Date().toISOString(),
  }

  await redis.hset(`track:${id}`, {
    ...track,
    duration: String(duration),
  })

  return track
}

export const getTrack = async (id: string): Promise<Track | null> => {
  const data = await redis.hgetall(`track:${id}`)
  if (!data.id) return null
  return {
    ...data,
    duration: parseFloat(data.duration),
  } as unknown as Track
}

export const addTrackToBranch = async (branchId: string, trackId: string) => {
  await redis.rpush(`branch:${branchId}:tracks`, trackId)
}

export const removeTrackFromBranch = async (branchId: string, trackId: string) => {
  await redis.lrem(`branch:${branchId}:tracks`, 0, trackId)
}

export const getBranchTracks = async (branchId: string): Promise<Track[]> => {
  const ids = await redis.lrange(`branch:${branchId}:tracks`, 0, -1)
  const tracks = await Promise.all(ids.map(getTrack))
  return tracks.filter((t): t is Track => t !== null)
}

export const getTrackPresignedUrl = async (fileName: string) => getMinioPresignedUrl(AUDIO_BUCKET, fileName)

export const deleteTrack = async (id: string) => {
  const track = await getTrack(id)
  if (!track) return

  await removeFile(AUDIO_BUCKET, track.fileName)
  await redis.del(`track:${id}`)
}
