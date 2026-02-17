import 'server-only'

import * as Minio from 'minio'

export const AUDIO_BUCKET = process.env.MINIO_BUCKET || 'moodtune'
export const IMAGE_BUCKET = `${AUDIO_BUCKET}-images`

const getMinioClient = () => {
  const globalMinio = globalThis as typeof globalThis & { __minio?: Minio.Client }

  if (!globalMinio.__minio) {
    globalMinio.__minio = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }

  return globalMinio.__minio
}

const minioClient = getMinioClient()

export const ensureBuckets = async () => {
  for (const bucket of [AUDIO_BUCKET, IMAGE_BUCKET]) {
    const exists = await minioClient.bucketExists(bucket)
    if (!exists) {
      await minioClient.makeBucket(bucket)
    }
  }
}

export const uploadFile = async (bucket: string, objectName: string, buffer: Buffer, contentType: string) => {
  await minioClient.putObject(bucket, objectName, buffer, buffer.length, { 'Content-Type': contentType })
}

export const getPresignedUrl = async (bucket: string, objectName: string, expiry = 3600) =>
  minioClient.presignedGetObject(bucket, objectName, expiry)

export const removeFile = async (bucket: string, objectName: string) => {
  await minioClient.removeObject(bucket, objectName)
}

export default minioClient
