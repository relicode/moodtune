import 'server-only'

import { createLogger } from '$/lib/logger'

import redis from './redis'

const log = createLogger('dal')

// --- Schema types ---

type FieldType = 'number' | 'nullable' | 'boolean' | 'json'

type Schema = Record<string, FieldType>

// --- Serialization ---

const serialize = (fields: Record<string, unknown>, schema: Schema): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (schema[key] === 'nullable') {
      result[key] = (value as string) ?? ''
    } else if (schema[key] === 'number') {
      result[key] = String(value)
    } else if (schema[key] === 'boolean') {
      result[key] = value ? 'true' : 'false'
    } else if (schema[key] === 'json') {
      result[key] = JSON.stringify(value)
    } else {
      result[key] = value as string
    }
  }
  return result
}

const deserialize = <T>(data: Record<string, string>, schema: Schema): T => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (schema[key] === 'nullable') {
      result[key] = value || undefined
    } else if (schema[key] === 'number') {
      result[key] = parseFloat(value) || 0
    } else if (schema[key] === 'boolean') {
      result[key] = value === 'true'
    } else if (schema[key] === 'json') {
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = []
      }
    } else {
      result[key] = value
    }
  }
  return result as T
}

// --- Hash (entity CRUD) ---

export const hashCreate = async <T extends { id: string; createdAt: string }>(
  prefix: string,
  fields: Record<string, unknown>,
  schema: Schema
): Promise<T> => {
  const id = crypto.randomUUID()
  const entity = { id, ...fields, createdAt: new Date().toISOString() }
  await redis.hset(`${prefix}:${id}`, serialize(entity, schema))
  log.debug({ prefix, id }, 'entity created')
  return entity as T
}

export const hashGet = async <T>(key: string, schema: Schema): Promise<T | null> => {
  const data = await redis.hgetall(key)
  if (!data.id) return null
  return deserialize<T>(data, schema)
}

export const hashSet = async (key: string, fields: Record<string, unknown>, schema: Schema) => {
  await redis.hset(key, serialize(fields, schema))
  log.debug({ key }, 'entity updated')
}

// --- List (ordered relationships) ---

export const listPush = async (key: string, value: string) => {
  await redis.rpush(key, value)
}

export const listRemove = async (key: string, value: string) => {
  await redis.lrem(key, 0, value)
}

export const listAll = async (key: string): Promise<string[]> => redis.lrange(key, 0, -1)

export const listGetAll = async <T>(key: string, getter: (id: string) => Promise<T | null>): Promise<T[]> => {
  const ids = await listAll(key)
  const items = await Promise.all(ids.map(getter))
  return items.filter((item): item is NonNullable<Awaited<T | null>> => item !== null) as T[]
}

// --- Set (memberships) ---

export const setAdd = async (key: string, value: string) => {
  await redis.sadd(key, value)
}

export const setRemove = async (key: string, value: string) => {
  await redis.srem(key, value)
}

export const setAll = async (key: string): Promise<string[]> => redis.smembers(key)

export const setHas = async (key: string, value: string): Promise<boolean> => {
  const result = await redis.sismember(key, value)
  return result === 1
}

export const setGetAll = async <T>(key: string, getter: (id: string) => Promise<T | null>): Promise<T[]> => {
  const ids = await setAll(key)
  const items = await Promise.all(ids.map(getter))
  return items.filter((item): item is NonNullable<Awaited<T | null>> => item !== null) as T[]
}
