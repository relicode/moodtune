import 'server-only'

import Redis from 'ioredis'

const getRedisClient = () => {
  const globalRedis = globalThis as typeof globalThis & { __redis?: Redis }

  if (!globalRedis.__redis) {
    globalRedis.__redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }

  return globalRedis.__redis
}

const redis = getRedisClient()

export default redis
