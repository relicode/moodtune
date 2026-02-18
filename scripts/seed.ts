#!/usr/bin/env -S tsx
import { hash } from 'bcryptjs'
import Redis from 'ioredis'
import * as Minio from 'minio'

const seed = async () => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin'

  const existingId = await redis.get(`user:byUsername:${adminUsername}`)
  if (existingId) {
    console.log(`Admin user "${adminUsername}" already exists, skipping.`)
  } else {
    const id = crypto.randomUUID()
    const passwordHash = await hash(adminPassword, 12)

    await redis.hset(`user:${id}`, {
      id,
      username: adminUsername,
      passwordHash,
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    })
    await redis.set(`user:byUsername:${adminUsername}`, id)
    console.log(`Created admin user "${adminUsername}".`)
  }

  const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  })

  const audioBucket = process.env.MINIO_BUCKET || 'moodtune'
  const imageBucket = `${audioBucket}-images`

  for (const bucket of [audioBucket, imageBucket]) {
    const exists = await minioClient.bucketExists(bucket)
    if (!exists) {
      await minioClient.makeBucket(bucket)
      console.log(`Created bucket "${bucket}".`)
    } else {
      console.log(`Bucket "${bucket}" already exists.`)
    }
  }

  await redis.quit()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
