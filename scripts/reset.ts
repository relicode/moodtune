#!/usr/bin/env -S tsx
import chalk from 'chalk'
import Redis from 'ioredis'
import * as Minio from 'minio'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const audioBucket = process.env.MINIO_BUCKET || 'moodtune'
const imageBucket = `${audioBucket}-images`

const flushRedis = async () => {
  await redis.flushdb()
  console.log(chalk.red('Redis flushed.'))
}

const emptyBucket = async (bucket: string) => {
  const exists = await minioClient.bucketExists(bucket)
  if (!exists) return

  const objects: string[] = []
  const stream = minioClient.listObjects(bucket, '', true)

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (obj) => {
      if (obj.name) objects.push(obj.name)
    })
    stream.on('error', reject)
    stream.on('end', resolve)
  })

  if (objects.length > 0) {
    await minioClient.removeObjects(bucket, objects)
  }

  console.log(chalk.red(`MinIO bucket "${bucket}" emptied (${objects.length} objects removed).`))
}

const reset = async () => {
  await flushRedis()
  await emptyBucket(audioBucket)
  await emptyBucket(imageBucket)
  await redis.quit()
  console.log(chalk.green('Reset complete.'))
}

reset().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
