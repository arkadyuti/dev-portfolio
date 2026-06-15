import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionData } from './session'

// ---------------------------------------------------------------------------
// Use vi.hoisted to declare mocks that are referenced in vi.mock factories
// (vi.mock calls are hoisted to the top of the file by vitest's transform,
//  so any factory that closes over outer variables must use vi.hoisted)
// ---------------------------------------------------------------------------
const { mockCookiesGet, mockCookiesFn } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn()
  const mockCookiesFn = vi.fn().mockResolvedValue({ get: mockCookiesGet })
  return { mockCookiesGet, mockCookiesFn }
})

vi.mock('next/headers', () => ({
  cookies: mockCookiesFn,
}))

// ---------------------------------------------------------------------------
// Mock jwt-edge verifyAccessToken
// ---------------------------------------------------------------------------
const mockVerifyAccessToken = vi.fn()
vi.mock('./jwt-edge', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
}))

// ---------------------------------------------------------------------------
// Mock session module
// ---------------------------------------------------------------------------
const mockGetSession = vi.fn()
const mockExtendSession = vi.fn().mockResolvedValue(true)
vi.mock('./session', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  extendSession: (...args: unknown[]) => mockExtendSession(...args),
}))

// ---------------------------------------------------------------------------
// Mock MongoDB + User model
// ---------------------------------------------------------------------------
const mockUserFindById = vi.fn()
vi.mock('@/models/user', () => ({
  default: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}))
vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}))

// Import AFTER mocks are registered
import {
  getCurrentUser,
  isAuthenticated,
  requireAuth,
  requireRole,
  requireAdmin,
  hasRole,
  isAdmin,
} from './helpers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeJWTPayload(overrides = {}) {
  return {
    userId: 'user-123',
    role: 'admin',
    sessionId: 'sess-abc',
    ...overrides,
  }
}

function makeSessionData(overrides: Partial<SessionData> = {}): SessionData {
  const now = Date.now()
  return {
    sessionId: 'sess-abc',
    userId: 'user-123',
    email: 'test@example.com',
    role: 'admin',
    userAgent: 'TestAgent',
    ipAddress: '1.2.3.4',
    createdAt: now - 1000,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  }
}

function makeSelectLeanChain(returnValue: unknown) {
  return { select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(returnValue) }) }
}

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------
describe('getCurrentUser', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockExtendSession.mockResolvedValue(true)
    // Reset cookies fn to return store with the mockCookiesGet
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns null when accessToken cookie is missing', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('returns null when token verification fails', async () => {
    mockCookiesGet.mockReturnValue({ value: 'bad-token' })
    mockVerifyAccessToken.mockResolvedValue(null)

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('returns null when session does not exist in Redis', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload())
    mockGetSession.mockResolvedValue(null)

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('returns null when user is not found in database', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload())
    mockGetSession.mockResolvedValue(makeSessionData())
    mockUserFindById.mockReturnValue(makeSelectLeanChain(null))

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })

  it('returns AuthUser with fresh role and email from database on success', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'editor' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'editor' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'fresh@example.com' })
    )

    const result = await getCurrentUser()

    expect(result).not.toBeNull()
    expect(result!.id).toBe('user-123')
    expect(result!.email).toBe('fresh@example.com')
    expect(result!.role).toBe('admin') // role from DB, not JWT
    expect(result!.sessionId).toBe('sess-abc')
  })

  it('falls back to session data when DB lookup throws', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'editor' }))
    mockGetSession.mockResolvedValue(makeSessionData({ email: 'session@example.com', role: 'editor' }))
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB down')),
      }),
    })

    const result = await getCurrentUser()

    expect(result).not.toBeNull()
    expect(result!.email).toBe('session@example.com') // from session fallback
    expect(result!.role).toBe('editor') // from JWT fallback
  })

  it('returns null when cookies() itself throws', async () => {
    mockCookiesFn.mockRejectedValueOnce(new Error('Runtime error'))

    const result = await getCurrentUser()

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isAuthenticated
// ---------------------------------------------------------------------------
describe('isAuthenticated', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns true when getCurrentUser returns a user', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload())
    mockGetSession.mockResolvedValue(makeSessionData())
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'test@example.com' })
    )

    const result = await isAuthenticated()
    expect(result).toBe(true)
  })

  it('returns false when getCurrentUser returns null', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await isAuthenticated()
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------
describe('requireAuth', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns user when authenticated', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload())
    mockGetSession.mockResolvedValue(makeSessionData())
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'test@example.com' })
    )

    const result = await requireAuth()
    expect(result.id).toBe('user-123')
  })

  it('throws Unauthorized error when not authenticated', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })
})

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------
describe('requireRole', () => {
  beforeEach(() => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'admin' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'admin' }))
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns user when user has required role', async () => {
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'test@example.com' })
    )

    const result = await requireRole('admin')
    expect(result.role).toBe('admin')
  })

  it('throws Forbidden error when user has a different role', async () => {
    // DB returns 'editor' but we require 'admin'
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'editor', email: 'test@example.com' })
    )

    await expect(requireRole('admin')).rejects.toThrow('Forbidden')
  })
})

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------
describe('requireAdmin', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('delegates to requireRole("admin") and returns user', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'admin' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'admin' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'test@example.com' })
    )

    const result = await requireAdmin()
    expect(result.role).toBe('admin')
  })

  it('throws when user is not admin', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'viewer' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'viewer' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'viewer', email: 'viewer@example.com' })
    )

    await expect(requireAdmin()).rejects.toThrow('Forbidden')
  })
})

// ---------------------------------------------------------------------------
// hasRole / isAdmin
// ---------------------------------------------------------------------------
describe('hasRole', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns true when user role matches', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'editor' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'editor' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'editor', email: 'ed@example.com' })
    )

    const result = await hasRole('editor')
    expect(result).toBe(true)
  })

  it('returns false when user is not authenticated', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await hasRole('admin')
    expect(result).toBe(false)
  })

  it('returns false when user role does not match', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'viewer' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'viewer' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'viewer', email: 'v@example.com' })
    )

    const result = await hasRole('admin')
    expect(result).toBe(false)
  })
})

describe('isAdmin', () => {
  beforeEach(() => {
    mockCookiesGet.mockReset()
    mockVerifyAccessToken.mockReset()
    mockGetSession.mockReset()
    mockUserFindById.mockReset()
    mockCookiesFn.mockResolvedValue({ get: mockCookiesGet })
  })

  it('returns true when user is admin', async () => {
    mockCookiesGet.mockReturnValue({ value: 'valid-token' })
    mockVerifyAccessToken.mockResolvedValue(makeJWTPayload({ role: 'admin' }))
    mockGetSession.mockResolvedValue(makeSessionData({ role: 'admin' }))
    mockUserFindById.mockReturnValue(
      makeSelectLeanChain({ role: 'admin', email: 'admin@example.com' })
    )

    const result = await isAdmin()
    expect(result).toBe(true)
  })

  it('returns false when user is not admin', async () => {
    mockCookiesGet.mockReturnValue(undefined)

    const result = await isAdmin()
    expect(result).toBe(false)
  })
})
