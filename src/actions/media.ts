'use server'

import { getPresignedUrl, IMAGE_BUCKET } from '$/data/minio'
import { getTrackPresignedUrl } from '$/data/tracks'
import { getSessionFromCookie } from '$/lib/session'

export const getTrackUrl = async (fileName: string): Promise<string | null> => {
  const session = await getSessionFromCookie()
  if (!session) return null
  return getTrackPresignedUrl(fileName)
}

export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  const session = await getSessionFromCookie()
  if (!session) return null
  return getPresignedUrl(IMAGE_BUCKET, imagePath)
}
