import getRedisClient from '@/lib/redis'

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxAttempts: number
  windowSeconds: number
}

/**
 * Default rate limit configurations
 */
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowSeconds: 15 * 60, // 15 minutes
  },
  api: {
    maxAttempts: 100,
    windowSeconds: 60, // 1 minute
  },
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds until next attempt allowed
}

/**
 * Lua script for atomic rate limiting
 * Returns: [allowed (0/1), remaining, ttl]
 */
const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local max_attempts = tonumber(ARGV[1])
  local window_seconds = tonumber(ARGV[2])

  local current = redis.call('GET', key)
  local count = 0

  if current then
    count = tonumber(current)
  end

  if count >= max_attempts then
    local ttl = redis.call('TTL', key)
    return {0, 0, ttl}
  end

  local new_count = redis.call('INCR', key)

  if new_count == 1 then
    redis.call('EXPIRE', key, window_seconds)
  end

  local ttl = redis.call('TTL', key)
  local remaining = max_attempts - new_count

  return {1, remaining, ttl}
`

/**
 * Check and increment rate limit (atomic operation)
 */
export async function checkRateLimit(
  identifier: string,
  type: 'login' | 'api' = 'api',
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const config = customConfig || RATE_LIMITS[type]
  const key = `ratelimit:${type}:${identifier}`

  try {
    const redis = getRedisClient()

    // Wait for Redis to be ready
    if (redis.status !== 'ready') {
      await redis.connect().catch(() => {
        // If connection fails, allow the request
      })
    }

    // Execute Lua script atomically
    const result = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      key,
      config.maxAttempts.toString(),
      config.windowSeconds.toString()
    )) as [number, number, number]

    const [allowed, remaining, ttl] = result
    const resetAt = new Date(Date.now() + ttl * 1000)

    if (allowed === 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl,
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error('Rate limit check error:', error instanceof Error ? error.message : error)

    // In case of Redis error, allow the request
    // but log the error for monitoring
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    }
  }
}

/**
 * Reset rate limit for an identifier
 * Useful for clearing limits after successful auth or for admin override
 */
export async function resetRateLimit(
  identifier: string,
  type: 'login' | 'api' = 'api'
): Promise<void> {
  const redis = getRedisClient()
  const key = `ratelimit:${type}:${identifier}`
  await redis.del(key)
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  type: 'login' | 'api' = 'api',
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient()
  const config = customConfig || RATE_LIMITS[type]
  const key = `ratelimit:${type}:${identifier}`

  try {
    const current = await redis.get(key)
    const count = current ? parseInt(current) : 0
    const ttl = await redis.ttl(key)

    const resetAt =
      ttl > 0
        ? new Date(Date.now() + ttl * 1000)
        : new Date(Date.now() + config.windowSeconds * 1000)

    const remaining = Math.max(0, config.maxAttempts - count)
    const allowed = count < config.maxAttempts

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : ttl,
    }
  } catch (error) {
    console.error('Rate limit status check error:', error)
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(Date.now() + config.windowSeconds * 1000),
    }
  }
}

/**
 * Helper to extract IP address from request headers
 * Handles proxies and common headers
 */
export function getClientIP(headers: Headers): string {
  // Try common proxy headers first
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    return ips[0]
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to connection remote address (not always available)
  const remoteAddr = headers.get('x-client-ip')
  if (remoteAddr) {
    return remoteAddr
  }

  // Default fallback
  return 'unknown'
}

/**
 * Format rate limit error response
 */
export function formatRateLimitError(result: RateLimitResult): {
  message: string
  retryAfter: number
} {
  const minutes = Math.ceil((result.retryAfter || 0) / 60)

  return {
    message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    retryAfter: result.retryAfter || 0,
  }
}
