import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockVerifyAccessToken = vi.hoisted(() => vi.fn())
const mockDeleteSession = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/jwt-edge', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock('@/lib/auth/session', () => ({
  deleteSession: mockDeleteSession,
}))

import { POST } from './route'

function makeRequest(cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest('http://localhost/api/auth/signout', {
    method: 'POST',
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  })
}

beforeEach(() => {
  mockVerifyAccessToken.mockResolvedValue({ sessionId: 'session-abc', userId: 'user-123', role: 'admin' })
  mockDeleteSession.mockResolvedValue(undefined)
})

describe('POST /api/auth/signout', () => {
  it('returns 200 and clears cookies even without a token', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    // Cookies should be cleared
    const setCookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']
    const hasDeletedAccess = setCookies.some(
      (c) => c.includes('accessToken=') && (c.includes('Max-Age=0') || c.includes('Expires='))
    )
    expect(hasDeletedAccess).toBe(true)
  })

  it('deletes session when valid access token present', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sessionId: 'session-abc', userId: 'user-123', role: 'admin' })

    const res = await POST(makeRequest({ accessToken: 'valid-token' }))
    expect(res.status).toBe(200)
    expect(mockDeleteSession).toHaveBeenCalledWith('session-abc')
  })

  it('does not delete session when token is invalid/expired', async () => {
    mockVerifyAccessToken.mockResolvedValue(null)

    const res = await POST(makeRequest({ accessToken: 'bad-token' }))
    expect(res.status).toBe(200)
    expect(mockDeleteSession).not.toHaveBeenCalled()
  })

  it('still succeeds and clears cookies even if deleteSession throws', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sessionId: 'session-abc', userId: 'user-123', role: 'admin' })
    mockDeleteSession.mockRejectedValue(new Error('Redis connection failed'))

    const res = await POST(makeRequest({ accessToken: 'valid-token' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns success message in body', async () => {
    const res = await POST(makeRequest())
    const json = await res.json()
    expect(json.data.message).toBe('Signed out successfully')
  })
})
