'use server'

import { getPresignedUrl, IMAGE_BUCKET } from '$/data/minio'
import { getSessionFromCookie } from '$/lib/session'

export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  const session = await getSessionFromCookie()
  if (!session) return null
  return getPresignedUrl(IMAGE_BUCKET, imagePath)
}
