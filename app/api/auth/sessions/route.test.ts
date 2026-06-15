import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockVerifyAccessToken = vi.hoisted(() => vi.fn())
const mockGetUserSessions = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockDeleteSession = vi.hoisted(() => vi.fn())
const mockDeleteAllUserSessions = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/jwt-edge', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock('@/lib/auth/session', () => ({
  getUserSessions: mockGetUserSessions,
  getSession: mockGetSession,
  deleteSession: mockDeleteSession,
  deleteAllUserSessions: mockDeleteAllUserSessions,
}))

vi.mock('@/lib/auth/crypto-utils', () => ({
  constantTimeCompare: (a: string, b: string) => a === b,
}))

import { GET, DELETE } from './route'

const VALID_PAYLOAD = {
  userId: 'user-123',
  role: 'admin' as const,
  sessionId: 'current-session',
}

const mockSessions = [
  {
    sessionId: 'current-session',
    userAgent: 'Chrome',
    ipAddress: '127.0.0.1',
    createdAt: Date.now() - 1000,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  },
  {
    sessionId: 'other-session',
    userAgent: 'Firefox',
    ipAddress: '192.168.1.1',
    createdAt: Date.now() - 2000,
    expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
  },
]

function makeRequest(
  method: string,
  cookies: Record<string, string> = {},
  searchParams: Record<string, string> = {}
) {
  const url = new URL('http://localhost/api/auth/sessions')
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest(url, {
    method,
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })
}

beforeEach(() => {
  mockVerifyAccessToken.mockResolvedValue(VALID_PAYLOAD)
  mockGetUserSessions.mockResolvedValue(mockSessions)
  mockGetSession.mockResolvedValue({ sessionId: 'other-session', userId: 'user-123' })
  mockDeleteSession.mockResolvedValue(undefined)
  mockDeleteAllUserSessions.mockResolvedValue(2)
})

describe('GET /api/auth/sessions', () => {
  it('returns 401 when no access token', async () => {
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when access token is invalid', async () => {
    mockVerifyAccessToken.mockResolvedValue(null)
    const res = await GET(makeRequest('GET', { accessToken: 'bad' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('INVALID_TOKEN')
  })

  it('returns 200 with sessions list', async () => {
    const res = await GET(makeRequest('GET', { accessToken: 'valid' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.sessions).toHaveLength(2)
  })

  it('marks current session correctly', async () => {
    const res = await GET(makeRequest('GET', { accessToken: 'valid' }))
    const json = await res.json()
    const current = json.data.sessions.find((s: { sessionId: string; isCurrent: boolean }) => s.sessionId === 'current-session')
    const other = json.data.sessions.find((s: { sessionId: string; isCurrent: boolean }) => s.sessionId === 'other-session')
    expect(current.isCurrent).toBe(true)
    expect(other.isCurrent).toBe(false)
  })

  it('formats session dates as ISO strings', async () => {
    const res = await GET(makeRequest('GET', { accessToken: 'valid' }))
    const json = await res.json()
    expect(json.data.sessions[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(json.data.sessions[0].expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('DELETE /api/auth/sessions', () => {
  it('returns 401 when no access token', async () => {
    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyAccessToken.mockResolvedValue(null)
    const res = await DELETE(makeRequest('DELETE', { accessToken: 'bad' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no sessionId and no all=true', async () => {
    const res = await DELETE(makeRequest('DELETE', { accessToken: 'valid' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('MISSING_SESSION_ID')
  })

  it('deletes specific session when sessionId provided', async () => {
    const res = await DELETE(
      makeRequest('DELETE', { accessToken: 'valid' }, { sessionId: 'other-session' })
    )
    expect(res.status).toBe(200)
    expect(mockDeleteSession).toHaveBeenCalledWith('other-session')
  })

  it('deletes all sessions when all=true', async () => {
    const res = await DELETE(
      makeRequest('DELETE', { accessToken: 'valid' }, { all: 'true' })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.count).toBe(2)
    expect(mockDeleteAllUserSessions).toHaveBeenCalledWith('user-123')
  })

  it('IDOR: returns 404 and does not delete when session belongs to a different user', async () => {
    // Session exists but is owned by a different user — classic IDOR scenario
    mockGetSession.mockResolvedValue({ sessionId: 'other-session', userId: 'attacker-user-999' })
    const res = await DELETE(
      makeRequest('DELETE', { accessToken: 'valid' }, { sessionId: 'other-session' })
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('SESSION_NOT_FOUND')
    expect(mockDeleteSession).not.toHaveBeenCalled()
  })

  it('IDOR: returns 404 and does not delete when session does not exist', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await DELETE(
      makeRequest('DELETE', { accessToken: 'valid' }, { sessionId: 'ghost-session' })
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('SESSION_NOT_FOUND')
    expect(mockDeleteSession).not.toHaveBeenCalled()
  })
})
