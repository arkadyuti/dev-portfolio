import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockVerifyRefreshToken = vi.hoisted(() => vi.fn())
const mockGenerateAccessToken = vi.hoisted(() => vi.fn())
const mockGenerateRefreshToken = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockCreateSession = vi.hoisted(() => vi.fn())
const mockDeleteSession = vi.hoisted(() => vi.fn())
const mockDeleteAllUserSessions = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/jwt-node', () => ({
  verifyRefreshToken: mockVerifyRefreshToken,
  generateAccessToken: mockGenerateAccessToken,
  generateRefreshToken: mockGenerateRefreshToken,
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
  deleteAllUserSessions: mockDeleteAllUserSessions,
}))

import { POST } from './route'

function makeRequest(cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest('http://localhost/api/auth/refresh', {
    method: 'POST',
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })
}

const mockPayload = {
  userId: 'user-123',
  role: 'admin' as const,
  sessionId: 'old-session-id',
}

const mockOldSession = {
  sessionId: 'old-session-id',
  userId: 'user-123',
  email: 'admin@example.com',
  role: 'admin' as const,
  userAgent: 'TestAgent',
  ipAddress: '127.0.0.1',
  createdAt: Date.now(),
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
}

beforeEach(() => {
  mockVerifyRefreshToken.mockReturnValue(mockPayload)
  mockGetSession.mockResolvedValue(mockOldSession)
  mockCreateSession.mockResolvedValue({ sessionId: 'new-session-id' })
  mockDeleteSession.mockResolvedValue(undefined)
  mockDeleteAllUserSessions.mockResolvedValue(2)
  mockGenerateAccessToken.mockReturnValue('new-access-token')
  mockGenerateRefreshToken.mockReturnValue('new-refresh-token')
})

describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refresh token cookie', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('NO_REFRESH_TOKEN')
  })

  it('returns 401 when refresh token is invalid', async () => {
    mockVerifyRefreshToken.mockReturnValue(null)

    const res = await POST(makeRequest({ refreshToken: 'bad-token' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('returns 401 and revokes all sessions on token reuse (no session in Redis)', async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(makeRequest({ refreshToken: 'valid-but-reused-token' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('TOKEN_REUSE_DETECTED')
    expect(mockDeleteAllUserSessions).toHaveBeenCalledWith('user-123')
  })

  it('returns 200 and sets new tokens on valid refresh', async () => {
    const res = await POST(makeRequest({ refreshToken: 'valid-refresh-token' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.message).toBe('Tokens refreshed successfully')
  })

  it('rotates session - creates new and deletes old', async () => {
    await POST(makeRequest({ refreshToken: 'valid-refresh-token' }))
    expect(mockCreateSession).toHaveBeenCalledOnce()
    expect(mockDeleteSession).toHaveBeenCalledWith('old-session-id')
  })

  it('sets new access token cookie', async () => {
    const res = await POST(makeRequest({ refreshToken: 'valid-refresh-token' }))
    const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']
    const accessCookie = setCookies.find((c) => c.includes('accessToken='))
    expect(accessCookie).toBeDefined()
    expect(accessCookie).toContain('new-access-token')
    expect(accessCookie).toContain('HttpOnly')
  })

  it('sets new refresh token cookie', async () => {
    const res = await POST(makeRequest({ refreshToken: 'valid-refresh-token' }))
    const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']
    const refreshCookie = setCookies.find((c) => c.includes('refreshToken='))
    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('new-refresh-token')
    expect(refreshCookie).toContain('HttpOnly')
  })

  it('generates new tokens with new session id', async () => {
    await POST(makeRequest({ refreshToken: 'valid-refresh-token' }))
    expect(mockGenerateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'new-session-id' })
    )
    expect(mockGenerateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'new-session-id' })
    )
  })
})
