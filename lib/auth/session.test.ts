import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionData } from './session'

// ---------------------------------------------------------------------------
// Mock @/lib/redis
// ---------------------------------------------------------------------------
const mockSetex = vi.fn()
const mockGet = vi.fn()
const mockDel = vi.fn()
const mockSadd = vi.fn()
const mockSrem = vi.fn()
const mockExpire = vi.fn()
const mockSmembers = vi.fn()
const mockMget = vi.fn()

const pipelineExec = vi.fn().mockResolvedValue([])
const mockPipeline = {
  setex: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  del: vi.fn().mockReturnThis(),
  srem: vi.fn().mockReturnThis(),
  exec: pipelineExec,
}

const mockRedisClient = {
  status: 'ready' as string,
  get: mockGet,
  del: mockDel,
  setex: mockSetex,
  sadd: mockSadd,
  srem: mockSrem,
  expire: mockExpire,
  smembers: mockSmembers,
  mget: mockMget,
  pipeline: vi.fn().mockReturnValue(mockPipeline),
}

vi.mock('@/lib/redis', () => ({
  default: () => mockRedisClient,
  getRedisClient: () => mockRedisClient,
  getConnectedRedisClient: () => Promise.resolve(mockRedisClient),
}))

// nanoid returns predictable IDs in tests (mock it to get stable session IDs)
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('test-session-id-32-chars-00000000'),
}))

import {
  createSession,
  getSession,
  deleteSession,
  getUserSessions,
  deleteAllUserSessions,
  extendSession,
  isSessionValid,
  cleanupExpiredSessions,
} from './session'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SESSION_EXPIRY_SECONDS = 7 * 24 * 60 * 60

function makeSessionData(overrides: Partial<SessionData> = {}): SessionData {
  const now = Date.now()
  return {
    sessionId: 'test-session-id-32-chars-00000000',
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    createdAt: now - 1000,
    expiresAt: now + SESSION_EXPIRY_SECONDS * 1000,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe('createSession', () => {
  it('returns a SessionData object with correct shape', async () => {
    pipelineExec.mockResolvedValue([])

    const data = await createSession({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'admin',
      userAgent: 'TestAgent',
      ipAddress: '10.0.0.1',
    })

    expect(data.sessionId).toBe('test-session-id-32-chars-00000000')
    expect(data.userId).toBe('user-123')
    expect(data.email).toBe('test@example.com')
    expect(data.role).toBe('admin')
    expect(data.userAgent).toBe('TestAgent')
    expect(data.ipAddress).toBe('10.0.0.1')
    expect(data.createdAt).toBeLessThanOrEqual(Date.now())
    expect(data.expiresAt).toBeGreaterThan(Date.now())
  })

  it('sets expiresAt to createdAt + 7 days in ms', async () => {
    pipelineExec.mockResolvedValue([])
    const before = Date.now()

    const data = await createSession({
      userId: 'u',
      email: 'e@e.com',
      role: 'viewer',
      userAgent: 'ua',
      ipAddress: '1.2.3.4',
    })

    const after = Date.now()
    const expectedMin = before + SESSION_EXPIRY_SECONDS * 1000
    const expectedMax = after + SESSION_EXPIRY_SECONDS * 1000
    expect(data.expiresAt).toBeGreaterThanOrEqual(expectedMin)
    expect(data.expiresAt).toBeLessThanOrEqual(expectedMax)
  })

  it('uses a pipeline with setex, sadd, and expire', async () => {
    pipelineExec.mockResolvedValue([])

    await createSession({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'admin',
      userAgent: 'ua',
      ipAddress: '1.1.1.1',
    })

    expect(mockRedisClient.pipeline).toHaveBeenCalled()
    expect(mockPipeline.setex).toHaveBeenCalledWith(
      'session:test-session-id-32-chars-00000000',
      SESSION_EXPIRY_SECONDS,
      expect.any(String)
    )
    expect(mockPipeline.sadd).toHaveBeenCalledWith(
      'user:user-123:sessions',
      'test-session-id-32-chars-00000000'
    )
    expect(mockPipeline.expire).toHaveBeenCalled()
    expect(pipelineExec).toHaveBeenCalled()
  })

  it('throws when pipeline.exec fails', async () => {
    pipelineExec.mockRejectedValue(new Error('Redis down'))

    await expect(
      createSession({
        userId: 'u',
        email: 'e@e.com',
        role: 'viewer',
        userAgent: 'ua',
        ipAddress: '0.0.0.0',
      })
    ).rejects.toThrow('Session storage unavailable')
  })
})

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------
describe('getSession', () => {
  it('returns null when the key does not exist in Redis', async () => {
    mockGet.mockResolvedValue(null)

    const result = await getSession('no-such-session')

    expect(result).toBeNull()
  })

  it('returns parsed SessionData for a valid session', async () => {
    const session = makeSessionData()
    mockGet.mockResolvedValue(JSON.stringify(session))

    const result = await getSession(session.sessionId)

    expect(result).toEqual(session)
  })

  it('returns null and deletes an expired session', async () => {
    const expired = makeSessionData({ expiresAt: Date.now() - 1000 })
    mockGet.mockResolvedValue(JSON.stringify(expired))
    // deleteSession will call get again, then pipeline
    mockGet.mockResolvedValueOnce(JSON.stringify(expired)) // first get in getSession
    mockGet.mockResolvedValueOnce(JSON.stringify(expired)) // get inside deleteSession

    const result = await getSession(expired.sessionId)

    expect(result).toBeNull()
  })

  it('returns null when Redis throws', async () => {
    mockGet.mockRejectedValue(new Error('connection lost'))

    const result = await getSession('some-id')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------
describe('deleteSession', () => {
  it('deletes the session key and removes from user set via pipeline', async () => {
    const session = makeSessionData()
    mockGet.mockResolvedValue(JSON.stringify(session))
    pipelineExec.mockResolvedValue([])

    await deleteSession(session.sessionId)

    expect(mockPipeline.del).toHaveBeenCalledWith('session:test-session-id-32-chars-00000000')
    expect(mockPipeline.srem).toHaveBeenCalledWith(
      'user:user-123:sessions',
      'test-session-id-32-chars-00000000'
    )
    expect(pipelineExec).toHaveBeenCalled()
  })

  it('still deletes the session key when data is missing (null from Redis)', async () => {
    mockGet.mockResolvedValue(null)
    mockDel.mockResolvedValue(1)

    await deleteSession('ghost-session')

    expect(mockDel).toHaveBeenCalledWith('session:ghost-session')
  })

  it('does not throw when Redis errors during deletion', async () => {
    mockGet.mockRejectedValue(new Error('Redis is down'))

    // Should not throw
    await expect(deleteSession('some-id')).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getUserSessions
// ---------------------------------------------------------------------------
describe('getUserSessions', () => {
  it('returns empty array when user has no session IDs in set', async () => {
    mockSmembers.mockResolvedValue([])

    const result = await getUserSessions('user-no-sessions')

    expect(result).toEqual([])
  })

  it('returns valid sessions sorted by createdAt descending', async () => {
    const now = Date.now()
    const older = makeSessionData({ sessionId: 'sess-1', createdAt: now - 10_000 })
    const newer = makeSessionData({ sessionId: 'sess-2', createdAt: now - 1_000 })

    mockSmembers.mockResolvedValue(['sess-1', 'sess-2'])
    mockMget.mockResolvedValue([JSON.stringify(older), JSON.stringify(newer)])

    const result = await getUserSessions('user-123')

    expect(result).toHaveLength(2)
    expect(result[0].sessionId).toBe('sess-2') // newest first
    expect(result[1].sessionId).toBe('sess-1')
  })

  it('skips sessions with null values and removes from set', async () => {
    mockSmembers.mockResolvedValue(['sess-alive', 'sess-dead'])
    const alive = makeSessionData({ sessionId: 'sess-alive' })
    mockMget.mockResolvedValue([JSON.stringify(alive), null])
    mockSrem.mockResolvedValue(1)

    const result = await getUserSessions('user-123')

    expect(result).toHaveLength(1)
    expect(mockSrem).toHaveBeenCalledWith('user:user-123:sessions', 'sess-dead')
  })

  it('skips expired sessions and removes from set', async () => {
    const expired = makeSessionData({ sessionId: 'sess-expired', expiresAt: Date.now() - 1000 })
    const alive = makeSessionData({ sessionId: 'sess-alive' })

    mockSmembers.mockResolvedValue(['sess-expired', 'sess-alive'])
    mockMget.mockResolvedValue([JSON.stringify(expired), JSON.stringify(alive)])
    mockSrem.mockResolvedValue(1)

    const result = await getUserSessions('user-123')

    expect(result).toHaveLength(1)
    expect(result[0].sessionId).toBe('sess-alive')
    expect(mockSrem).toHaveBeenCalledWith('user:user-123:sessions', 'sess-expired')
  })
})

// ---------------------------------------------------------------------------
// deleteAllUserSessions
// ---------------------------------------------------------------------------
describe('deleteAllUserSessions', () => {
  it('returns 0 when user has no sessions', async () => {
    mockSmembers.mockResolvedValue([])

    const count = await deleteAllUserSessions('user-empty')

    expect(count).toBe(0)
  })

  it('deletes all session keys and the user set, returns count', async () => {
    mockSmembers.mockResolvedValue(['s1', 's2', 's3'])
    pipelineExec.mockResolvedValue([])

    const count = await deleteAllUserSessions('user-123')

    expect(count).toBe(3)
    expect(mockPipeline.del).toHaveBeenCalledWith('session:s1', 'session:s2', 'session:s3')
    expect(mockPipeline.del).toHaveBeenCalledWith('user:user-123:sessions')
    expect(pipelineExec).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// extendSession
// ---------------------------------------------------------------------------
describe('extendSession', () => {
  it('returns false when session does not exist', async () => {
    mockGet.mockResolvedValue(null)

    const result = await extendSession('no-such-id')

    expect(result).toBe(false)
  })

  it('returns true without updating when less than 50% of session time has passed', async () => {
    const now = Date.now()
    // Session was just created (0% elapsed) → should NOT extend
    const session = makeSessionData({
      createdAt: now - 1000,
      expiresAt: now + SESSION_EXPIRY_SECONDS * 1000 - 1000,
    })
    mockGet.mockResolvedValue(JSON.stringify(session))

    const result = await extendSession(session.sessionId)

    expect(result).toBe(true)
    expect(mockSetex).not.toHaveBeenCalled()
  })

  it('extends session when more than 50% of session time has passed', async () => {
    const halfSeconds = SESSION_EXPIRY_SECONDS / 2
    const now = Date.now()
    // Created 3.6 days ago — past the halfway point
    const createdAt = now - halfSeconds * 1000 - 100_000
    const session = makeSessionData({
      createdAt,
      expiresAt: createdAt + SESSION_EXPIRY_SECONDS * 1000,
    })
    mockGet.mockResolvedValue(JSON.stringify(session))
    mockSetex.mockResolvedValue('OK')

    const result = await extendSession(session.sessionId)

    expect(result).toBe(true)
    expect(mockSetex).toHaveBeenCalledWith(
      `session:${session.sessionId}`,
      SESSION_EXPIRY_SECONDS,
      expect.any(String)
    )
  })

  it('returns false when an error occurs', async () => {
    mockGet.mockRejectedValue(new Error('Redis error'))

    const result = await extendSession('some-id')

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isSessionValid
// ---------------------------------------------------------------------------
describe('isSessionValid', () => {
  it('returns true for a valid (non-expired) session', async () => {
    const session = makeSessionData()
    mockGet.mockResolvedValue(JSON.stringify(session))

    const result = await isSessionValid(session.sessionId)

    expect(result).toBe(true)
  })

  it('returns false when session does not exist', async () => {
    mockGet.mockResolvedValue(null)

    const result = await isSessionValid('ghost')

    expect(result).toBe(false)
  })

  it('returns false for an expired session', async () => {
    const expired = makeSessionData({ expiresAt: Date.now() - 5000 })
    mockGet.mockResolvedValueOnce(JSON.stringify(expired)) // getSession
    mockGet.mockResolvedValueOnce(JSON.stringify(expired)) // inside deleteSession

    const result = await isSessionValid(expired.sessionId)

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// cleanupExpiredSessions
// ---------------------------------------------------------------------------
describe('cleanupExpiredSessions', () => {
  it('always returns 0 (Redis TTL handles cleanup)', async () => {
    const result = await cleanupExpiredSessions()
    expect(result).toBe(0)
  })
})
