import Redis from 'ioredis'

/**
 * Redis client configuration
 *
 * To switch to Upstash (Edge-compatible):
 * 1. yarn add @upstash/redis
 * 2. Set REDIS_PROVIDER=upstash in .env
 * 3. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */

// Singleton Redis client
let redis: Redis | null = null

// Track connection promise to avoid race conditions
let connectionPromise: Promise<void> | null = null

/**
 * Ensure Redis is connected
 */
async function ensureConnection(client: Redis): Promise<void> {
  if (client.status === 'ready') {
    return
  }

  if (client.status === 'connecting' && connectionPromise) {
    return connectionPromise
  }

  if (client.status === 'end' || client.status === 'close') {
    connectionPromise = client.connect()
    return connectionPromise
  }

  // Status is 'wait' or other, initiate connection
  connectionPromise = client.connect()
  return connectionPromise
}

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redis) {
    const provider = process.env.REDIS_PROVIDER || 'ioredis'

    if (provider === 'upstash') {
      throw new Error(
        'Upstash Redis not implemented yet. ' +
          'Set REDIS_PROVIDER=ioredis or implement Upstash adapter.'
      )
    }

    // IORedis (default) - works with standard Redis
    const redisUrl = process.env.REDIS_URL

    if (redisUrl) {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
        enableOfflineQueue: false,
      })
    } else {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
        enableOfflineQueue: false,
      })
    }

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message)
    })

    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })

    redis.on('ready', () => {
      connectionPromise = null // Reset after successful connection
    })
  }

  return redis
}

/**
 * Get Redis client and ensure it's connected
 * Use this in async contexts where you need guaranteed connection
 */
export async function getConnectedRedisClient(): Promise<Redis> {
  const client = getRedisClient()
  await ensureConnection(client)
  return client
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

/**
 * Check if Redis is healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}

export default getRedisClient
