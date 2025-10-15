import { nanoid } from 'nanoid'
import getRedisClient from '@/lib/redis'
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
  const redis = getRedisClient()
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

  // Store session in Redis with automatic expiry
  const key = `session:${sessionId}`
  await redis.setex(key, SESSION_EXPIRY_SECONDS, JSON.stringify(sessionData))

  return sessionData
}

/**
 * Get session from Redis
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const redis = getRedisClient()
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
  const redis = getRedisClient()
  const key = `session:${sessionId}`
  await redis.del(key)
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const redis = getRedisClient()
  const pattern = 'session:*'

  // Get all session keys
  const keys = await redis.keys(pattern)
  if (keys.length === 0) return []

  // Get all session data
  const values = await redis.mget(...keys)

  const sessions: SessionData[] = []
  for (const value of values) {
    if (!value) continue

    try {
      const sessionData: SessionData = JSON.parse(value)

      // Only include sessions for this user that haven't expired
      if (sessionData.userId === userId && sessionData.expiresAt > Date.now()) {
        sessions.push(sessionData)
      }
    } catch (error) {
      console.error('Error parsing session data:', error)
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
  const redis = getRedisClient()
  const sessions = await getUserSessions(userId)

  if (sessions.length === 0) return 0

  const keys = sessions.map((s) => `session:${s.sessionId}`)
  await redis.del(...keys)

  return keys.length
}

/**
 * Extend session expiry
 * Useful when user is active and we want to keep them logged in
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  const redis = getRedisClient()
  const key = `session:${sessionId}`

  const data = await redis.get(key)
  if (!data) return false

  try {
    const sessionData: SessionData = JSON.parse(data)

    // Update expiry time
    const now = Date.now()
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
 * Note: Redis TTL handles this automatically, but this can be used for manual cleanup
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const redis = getRedisClient()
  const pattern = 'session:*'

  const keys = await redis.keys(pattern)
  if (keys.length === 0) return 0

  const values = await redis.mget(...keys)
  const expiredKeys: string[] = []

  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (!value) continue

    try {
      const sessionData: SessionData = JSON.parse(value)
      if (sessionData.expiresAt < Date.now()) {
        expiredKeys.push(keys[i])
      }
    } catch (error) {
      // Invalid session data, mark for deletion
      expiredKeys.push(keys[i])
    }
  }

  if (expiredKeys.length > 0) {
    await redis.del(...expiredKeys)
  }

  return expiredKeys.length
}
