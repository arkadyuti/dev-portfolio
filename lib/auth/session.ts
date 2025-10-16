import { nanoid } from 'nanoid'
import { getConnectedRedisClient } from '@/lib/redis'
import type { UserRole } from '@/models/user'

/**
 * Session data interface
 */
export interface SessionData {
  sessionId: string
  userId: string
  email: string
  role: UserRole
  userAgent: string
  ipAddress: string
  createdAt: number
  expiresAt: number
}

/**
 * Session expiry time (7 days in seconds)
 */
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days

/**
 * Create a new session in Redis
 */
export async function createSession(data: {
  userId: string
  email: string
  role: UserRole
  userAgent: string
  ipAddress: string
}): Promise<SessionData> {
  const redis = await getConnectedRedisClient()
  const sessionId = nanoid(32)
  const now = Date.now()

  const sessionData: SessionData = {
    sessionId,
    userId: data.userId,
    email: data.email,
    role: data.role,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY_SECONDS * 1000,
  }

  const sessionKey = `session:${sessionId}`
  const userSessionsKey = `user:${data.userId}:sessions`

  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline()
    pipeline.setex(sessionKey, SESSION_EXPIRY_SECONDS, JSON.stringify(sessionData))
    pipeline.sadd(userSessionsKey, sessionId)
    pipeline.expire(userSessionsKey, SESSION_EXPIRY_SECONDS + 86400) // Keep set 1 day longer than sessions
    await pipeline.exec()

    return sessionData
  } catch (error) {
    console.error('[CRITICAL] Redis session creation failed:', error)
    throw new Error('Session storage unavailable - authentication disabled')
  }
}

/**
 * Get session from Redis
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const redis = await getConnectedRedisClient()
    const key = `session:${sessionId}`

    const data = await redis.get(key)
    if (!data) return null

    const sessionData: SessionData = JSON.parse(data)

    // Check if session has expired
    if (sessionData.expiresAt < Date.now()) {
      await deleteSession(sessionId)
      return null
    }

    return sessionData
  } catch (error) {
    console.error('Error getting session:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Delete a session from Redis
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = await getConnectedRedisClient()
  const sessionKey = `session:${sessionId}`

  try {
    // Get userId before deleting to clean up the set
    const sessionData = await redis.get(sessionKey)

    if (sessionData) {
      try {
        const parsed: SessionData = JSON.parse(sessionData)
        const userSessionsKey = `user:${parsed.userId}:sessions`

        const pipeline = redis.pipeline()
        pipeline.del(sessionKey)
        pipeline.srem(userSessionsKey, sessionId)
        await pipeline.exec()
      } catch (error) {
        // If parsing fails, just delete the session key
        await redis.del(sessionKey)
      }
    } else {
      await redis.del(sessionKey)
    }
  } catch (error) {
    console.error('[ERROR] Redis session deletion failed:', error)
    // Non-critical: Session might have already expired or Redis is down
    // Don't throw - allow logout to proceed
  }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const redis = await getConnectedRedisClient()
  const userSessionsKey = `user:${userId}:sessions`

  // Get session IDs from set (O(1) instead of O(N) with keys())
  const sessionIds = await redis.smembers(userSessionsKey)
  if (sessionIds.length === 0) return []

  // Get all session data
  const sessionKeys = sessionIds.map((id) => `session:${id}`)
  const values = await redis.mget(...sessionKeys)

  const sessions: SessionData[] = []
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (!value) {
      // Session expired but still in set, clean it up
      await redis.srem(userSessionsKey, sessionIds[i])
      continue
    }

    try {
      const sessionData: SessionData = JSON.parse(value)
      if (sessionData.expiresAt > Date.now()) {
        sessions.push(sessionData)
      } else {
        // Expired, clean up from set
        await redis.srem(userSessionsKey, sessionIds[i])
      }
    } catch (error) {
      console.error('Error parsing session data:', error)
      // Clean up invalid session from set
      await redis.srem(userSessionsKey, sessionIds[i])
    }
  }

  // Sort by creation date (newest first)
  return sessions.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Delete all sessions for a user
 * Useful when password changes or user logout from all devices
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const redis = await getConnectedRedisClient()
  const userSessionsKey = `user:${userId}:sessions`

  // Get session IDs from set
  const sessionIds = await redis.smembers(userSessionsKey)
  if (sessionIds.length === 0) return 0

  const sessionKeys = sessionIds.map((id) => `session:${id}`)

  const pipeline = redis.pipeline()
  pipeline.del(...sessionKeys)
  pipeline.del(userSessionsKey)
  await pipeline.exec()

  return sessionIds.length
}

/**
 * Extend session expiry (sliding window)
 * Only extends if more than 50% of session time has passed
 * Useful when user is active and we want to keep them logged in
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  const redis = await getConnectedRedisClient()
  const key = `session:${sessionId}`

  const data = await redis.get(key)
  if (!data) return false

  try {
    const sessionData: SessionData = JSON.parse(data)
    const now = Date.now()

    // Only extend if more than 50% of session time has passed (3.5 days for 7-day sessions)
    const halfwayPoint = sessionData.createdAt + (SESSION_EXPIRY_SECONDS * 1000) / 2

    if (now < halfwayPoint) {
      // Still in first half of session, don't extend yet
      return true
    }

    // Update expiry time
    sessionData.expiresAt = now + SESSION_EXPIRY_SECONDS * 1000

    // Save back to Redis with new expiry
    await redis.setex(key, SESSION_EXPIRY_SECONDS, JSON.stringify(sessionData))

    return true
  } catch (error) {
    console.error('Error extending session:', error)
    return false
  }
}

/**
 * Check if a session exists and is valid
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId)
  return session !== null
}

/**
 * Cleanup expired sessions (for maintenance)
 * Note: Redis TTL handles session cleanup automatically.
 * Set cleanup happens lazily in getUserSessions().
 * This function is kept for backward compatibility but does nothing.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  // Redis TTL auto-expires sessions
  // Set cleanup happens lazily in getUserSessions()
  return 0
}
