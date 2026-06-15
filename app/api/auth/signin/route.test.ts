import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock functions
const mockFindOne = vi.hoisted(() => vi.fn())
const mockComparePassword = vi.hoisted(() => vi.fn())
const mockGenerateAccessToken = vi.hoisted(() => vi.fn())
const mockGenerateRefreshToken = vi.hoisted(() => vi.fn())
const mockCreateSession = vi.hoisted(() => vi.fn())
const mockCheckRateLimit = vi.hoisted(() => vi.fn())
const mockGetClientIP = vi.hoisted(() => vi.fn())
const mockFormatRateLimitError = vi.hoisted(() => vi.fn())
const mockResetRateLimit = vi.hoisted(() => vi.fn())
const mockConnectToDatabase = vi.hoisted(() => vi.fn())
const mockIsConnected = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('@/models/user', () => ({
  default: {
    findOne: mockFindOne,
  },
}))

vi.mock('@/lib/auth/password', () => ({
  comparePassword: mockComparePassword,
}))

vi.mock('@/lib/auth/jwt-node', () => ({
  generateAccessToken: mockGenerateAccessToken,
  generateRefreshToken: mockGenerateRefreshToken,
}))

vi.mock('@/lib/auth/session', () => ({
  createSession: mockCreateSession,
}))

vi.mock('@/lib/auth/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIP: mockGetClientIP,
  formatRateLimitError: mockFormatRateLimitError,
  resetRateLimit: mockResetRateLimit,
}))

// import AFTER mocks
import { POST } from './route'

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const mockUser = {
  _id: { toString: () => 'user-id-123' },
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin' as const,
  passwordHash: '$2b$10$hashedPassword',
  isLocked: false,
  lockUntil: null,
  lastLogin: null,
  incrementFailedAttempts: vi.fn(),
  resetFailedAttempts: vi.fn(),
  save: vi.fn(),
}

beforeEach(() => {
  mockIsConnected.mockReturnValue(true)
  mockConnectToDatabase.mockResolvedValue(undefined)
  mockGetClientIP.mockReturnValue('127.0.0.1')
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: new Date() })
  mockResetRateLimit.mockResolvedValue(undefined)
  mockComparePassword.mockResolvedValue(true)
  mockGenerateAccessToken.mockReturnValue('access-token-abc')
  mockGenerateRefreshToken.mockReturnValue('refresh-token-xyz')
  mockCreateSession.mockResolvedValue({ sessionId: 'session-abc-123' })
  mockUser.incrementFailedAttempts.mockResolvedValue(undefined)
  mockUser.resetFailedAttempts.mockResolvedValue(undefined)
  mockUser.save.mockResolvedValue(mockUser)
})

describe('POST /api/auth/signin', () => {
  describe('validation', () => {
    it('returns 400 for missing email', async () => {
      const res = await POST(makeRequest({ password: 'pass' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for invalid email format', async () => {
      const res = await POST(makeRequest({ email: 'notanemail', password: 'pass' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for missing password', async () => {
      const res = await POST(makeRequest({ email: 'test@example.com' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        retryAfter: 900,
      })
      mockFormatRateLimitError.mockReturnValue({
        message: 'Too many login attempts',
        retryAfter: 900,
      })

      const res = await POST(makeRequest({ email: 'test@example.com', password: 'mypassword' }))
      expect(res.status).toBe(429)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('authentication', () => {
    it('returns 401 with generic message for nonexistent user (no user enumeration)', async () => {
      mockFindOne.mockResolvedValue(null)
      mockComparePassword.mockResolvedValue(false) // dummy hash comparison

      const res = await POST(makeRequest({ email: 'nobody@example.com', password: 'wrong' }))
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
      expect(json.error.message).toBe('Invalid email or password')
    })

    it('returns 401 with same generic message for wrong password (no user enumeration)', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(false)

      const res = await POST(makeRequest({ email: 'admin@example.com', password: 'wrong' }))
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INVALID_CREDENTIALS')
      expect(json.error.message).toBe('Invalid email or password')
    })

    it('increments failed attempts on wrong password', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(false)

      await POST(makeRequest({ email: 'admin@example.com', password: 'wrong' }))
      expect(mockUser.incrementFailedAttempts).toHaveBeenCalledOnce()
    })

    it('returns 423 when account is locked', async () => {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
      const lockedUser = {
        ...mockUser,
        isLocked: true,
        lockUntil,
      }
      mockFindOne.mockResolvedValue(lockedUser)
      mockComparePassword.mockResolvedValue(true)

      const res = await POST(makeRequest({ email: 'admin@example.com', password: 'correct' }))
      expect(res.status).toBe(423)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('ACCOUNT_LOCKED')
    })

    it('returns 200 with user data on valid credentials', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(true)

      const res = await POST(makeRequest({ email: 'admin@example.com', password: 'correctpass' }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.user.id).toBe('user-id-123')
      expect(json.data.user.email).toBe('admin@example.com')
      expect(json.data.user.role).toBe('admin')
      // password hash must NOT be in response
      expect(JSON.stringify(json)).not.toContain('passwordHash')
    })

    it('sets httpOnly access token cookie on success', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(true)

      const res = await POST(makeRequest({ email: 'admin@example.com', password: 'correctpass' }))
      expect(res.status).toBe(200)
      const setCookie = res.headers.get('set-cookie') ?? ''
      expect(setCookie).toContain('accessToken=access-token-abc')
      expect(setCookie).toContain('HttpOnly')
    })

    it('sets httpOnly refresh token cookie on success', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(true)

      const res = await POST(makeRequest({ email: 'admin@example.com', password: 'correctpass' }))
      expect(res.status).toBe(200)
      // Next.js collapses multiple set-cookie into one comma-sep header
      const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']
      const refreshCookie = setCookies.find((c) => c.includes('refreshToken='))
      expect(refreshCookie).toBeDefined()
      expect(refreshCookie).toContain('HttpOnly')
    })

    it('calls comparePassword even when user does not exist (timing attack prevention)', async () => {
      mockFindOne.mockResolvedValue(null)
      mockComparePassword.mockResolvedValue(false)

      await POST(makeRequest({ email: 'nobody@example.com', password: 'anything' }))
      expect(mockComparePassword).toHaveBeenCalledOnce()
    })

    it('resets failed attempts and rate limit on successful login', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(true)

      await POST(makeRequest({ email: 'admin@example.com', password: 'correctpass' }))
      expect(mockUser.resetFailedAttempts).toHaveBeenCalledOnce()
      expect(mockResetRateLimit).toHaveBeenCalledWith('127.0.0.1', 'login')
    })

    it('creates a session on successful login', async () => {
      mockFindOne.mockResolvedValue(mockUser)
      mockComparePassword.mockResolvedValue(true)

      await POST(makeRequest({ email: 'admin@example.com', password: 'correctpass' }))
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-123',
          email: 'admin@example.com',
          role: 'admin',
        })
      )
    })
  })
})
