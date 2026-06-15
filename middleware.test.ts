/**
 * Tests for middleware.ts
 *
 * Covers:
 *  - Protected path with no token → redirect to /signin with returnUrl
 *  - Protected path with an invalid/expired token (verifyAccessToken returns null) → redirect
 *  - Protected path with a valid token → NextResponse.next() (allowed)
 *  - Error thrown inside verifyAccessToken → redirect to /signin for safety
 *
 * Strategy:
 *  - Mock `@/lib/auth/jwt-edge` so verifyAccessToken is under test control.
 *  - Use real `next/server` NextRequest / NextResponse — they work in the jsdom
 *    environment used by vitest because Next.js ships a polyfilled build of
 *    next/server that doesn't depend on the Edge runtime.
 *  - Cookies are injected via the `Cookie` request header (the standard way to
 *    supply cookies to NextRequest in tests).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock jwt-edge BEFORE importing middleware (hoisted so vi.mock runs first)
// ---------------------------------------------------------------------------
const { mockVerifyAccessToken } = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
}))

vi.mock('@/lib/auth/jwt-edge', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

// Import middleware after mocks are wired up
import { middleware } from './middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a NextRequest to a given URL, optionally including an accessToken cookie.
 */
function makeRequest(url: string, accessToken?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (accessToken !== undefined) {
    headers['Cookie'] = `accessToken=${accessToken}`
  }
  return new NextRequest(url, { headers })
}

const validPayload = {
  userId: 'user-1',
  role: 'admin',
  sessionId: 'session-abc',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── no token ──────────────────────────────────────────────────────────────

  it('redirects to /signin when no accessToken cookie is present', async () => {
    const req = makeRequest('http://localhost/admin/dashboard')

    const response = await middleware(req)

    expect(response.status).toBe(307) // NextResponse.redirect uses 307 by default
    const location = response.headers.get('Location')
    expect(location).toContain('/signin')
    expect(location).toContain('returnUrl=%2Fadmin%2Fdashboard')

    // verifyAccessToken should never be called when there is no token
    expect(mockVerifyAccessToken).not.toHaveBeenCalled()
  })

  it('includes the correct returnUrl for a nested admin path', async () => {
    const req = makeRequest('http://localhost/admin/blogs/new')

    const response = await middleware(req)

    const location = response.headers.get('Location')!
    const url = new URL(location)
    expect(url.pathname).toBe('/signin')
    expect(url.searchParams.get('returnUrl')).toBe('/admin/blogs/new')
  })

  // ── invalid / expired token ───────────────────────────────────────────────

  it('redirects to /signin when verifyAccessToken returns null (invalid token)', async () => {
    mockVerifyAccessToken.mockResolvedValue(null)

    const req = makeRequest('http://localhost/admin', 'bad-token')

    const response = await middleware(req)

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('bad-token')
    expect(response.status).toBe(307)
    const location = response.headers.get('Location')!
    expect(location).toContain('/signin')
    expect(location).toContain('returnUrl=%2Fadmin')
  })

  // ── valid token ───────────────────────────────────────────────────────────

  it('allows request through when verifyAccessToken returns a valid payload', async () => {
    mockVerifyAccessToken.mockResolvedValue(validPayload)

    const req = makeRequest('http://localhost/admin', 'valid-jwt-token')

    const response = await middleware(req)

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid-jwt-token')
    // NextResponse.next() returns 200 with no Location header
    expect(response.status).toBe(200)
    expect(response.headers.get('Location')).toBeNull()
  })

  // ── error path ────────────────────────────────────────────────────────────

  it('redirects to /signin when verifyAccessToken throws (safety fallback)', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('unexpected jwt error'))

    const req = makeRequest('http://localhost/admin/settings', 'some-token')

    const response = await middleware(req)

    // Middleware catches the error and redirects for safety
    expect(response.status).toBe(307)
    const location = response.headers.get('Location')!
    expect(location).toContain('/signin')
    expect(location).toContain('returnUrl=%2Fadmin%2Fsettings')
  })
})
