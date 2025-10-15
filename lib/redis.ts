import Redis from 'ioredis'

/**
 * Redis client configuration
 * Used for sessions, rate limiting, and token blacklist
 */

// Singleton Redis client
let redis: Redis | null = null

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redis) {
    // Allow flexible Redis connection configuration
    const redisUrl = process.env.REDIS_URL

    if (redisUrl) {
      // Use connection URL if provided
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false, // Fail fast if not connected
      })
    } else {
      // Use individual connection parameters
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
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false, // Fail fast if not connected
      })
    }

    // Error handling
    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message)
    })

    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })

    // Try to connect
    redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err.message)
    })
  }

  return redis
}

/**
 * Close Redis connection
 * Use during application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

/**
 * Check if Redis is connected and healthy
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
