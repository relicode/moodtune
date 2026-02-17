'use server'

import { getPresignedUrl, IMAGE_BUCKET } from '$/data/minio'
import { getSessionFromCookie } from '$/lib/session'

const IMAGE_PATH_RE = /^image\/[0-9a-f-]{36}\.webp$/

export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  const session = await getSessionFromCookie()
  if (!session) return null
  if (!IMAGE_PATH_RE.test(imagePath)) return null
  return getPresignedUrl(IMAGE_BUCKET, imagePath)
}
