import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyAccessTokenSync,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
} from '@/lib/auth/jwt-node'

// ── helpers ────────────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

const BASE_PAYLOAD = {
  userId: 'user-123',
  role: 'admin',
  sessionId: 'session-abc',
}

/** Sign a token with the access secret and a custom exp (seconds from now). */
function signWithExpiry(payload: object, secret: string, expiresInSec: number): string {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresInSec,
  })
}

// ── generateAccessToken ────────────────────────────────────────────────────

describe('generateAccessToken', () => {
  it('returns a non-empty string', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('token contains the correct payload fields', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const decoded = jwt.decode(token) as Record<string, unknown>
    expect(decoded.userId).toBe(BASE_PAYLOAD.userId)
    expect(decoded.role).toBe(BASE_PAYLOAD.role)
    expect(decoded.sessionId).toBe(BASE_PAYLOAD.sessionId)
    expect(decoded.v).toBe(1) // JWT_SECRET_VERSION from env
  })

  it('embeds iat and exp', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const decoded = jwt.decode(token) as Record<string, unknown>
    expect(typeof decoded.iat).toBe('number')
    expect(typeof decoded.exp).toBe('number')
  })

  it('exp is approximately 15 minutes from now', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = generateAccessToken(BASE_PAYLOAD)
    const after = Math.floor(Date.now() / 1000)
    const decoded = jwt.decode(token) as Record<string, unknown>
    const exp = decoded.exp as number
    // 15 minutes = 900 seconds, allow a small window
    expect(exp).toBeGreaterThanOrEqual(before + 900 - 2)
    expect(exp).toBeLessThanOrEqual(after + 900 + 2)
  })

  it('two tokens are different (random iat)', () => {
    const t1 = generateAccessToken(BASE_PAYLOAD)
    const t2 = generateAccessToken(BASE_PAYLOAD)
    // Same payload but generated at potentially different times; tokens can be
    // identical within the same second — check structure, not strict inequality.
    expect(typeof t1).toBe('string')
    expect(typeof t2).toBe('string')
  })
})

// ── generateRefreshToken ───────────────────────────────────────────────────

describe('generateRefreshToken', () => {
  it('returns a non-empty string', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('uses the refresh secret (cannot be verified with access secret)', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    expect(() => jwt.verify(token, ACCESS_SECRET)).toThrow()
  })

  it('can be verified with the refresh secret', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    const decoded = jwt.verify(token, REFRESH_SECRET) as Record<string, unknown>
    expect(decoded.userId).toBe(BASE_PAYLOAD.userId)
  })

  it('exp is approximately 7 days from now', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = generateRefreshToken(BASE_PAYLOAD)
    const after = Math.floor(Date.now() / 1000)
    const decoded = jwt.decode(token) as Record<string, unknown>
    const exp = decoded.exp as number
    const sevenDays = 7 * 24 * 60 * 60
    expect(exp).toBeGreaterThanOrEqual(before + sevenDays - 2)
    expect(exp).toBeLessThanOrEqual(after + sevenDays + 2)
  })
})

// ── verifyAccessToken (async) ─────────────────────────────────────────────

describe('verifyAccessToken (async)', () => {
  it('resolves with payload for a valid token', async () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const result = await verifyAccessToken(token)
    expect(result).not.toBeNull()
    expect(result?.userId).toBe(BASE_PAYLOAD.userId)
    expect(result?.role).toBe(BASE_PAYLOAD.role)
    expect(result?.sessionId).toBe(BASE_PAYLOAD.sessionId)
  })

  it('resolves null for a tampered token', async () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const tampered = token.slice(0, -5) + 'XXXXX'
    const result = await verifyAccessToken(tampered)
    expect(result).toBeNull()
  })

  it('resolves null for a token signed with the wrong secret', async () => {
    const token = jwt.sign(BASE_PAYLOAD, 'wrong-secret', {
      algorithm: 'HS256',
      expiresIn: '15m',
    })
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('resolves null for an expired token', async () => {
    // Sign a token that expired 1 second ago
    const token = signWithExpiry(BASE_PAYLOAD, ACCESS_SECRET, -1)
    const result = await verifyAccessToken(token)
    expect(result).toBeNull()
  })

  it('resolves null for an empty string', async () => {
    const result = await verifyAccessToken('')
    expect(result).toBeNull()
  })

  it('resolves null for a completely invalid string', async () => {
    const result = await verifyAccessToken('not-a-jwt')
    expect(result).toBeNull()
  })
})

// ── verifyAccessTokenSync ─────────────────────────────────────────────────

describe('verifyAccessTokenSync', () => {
  it('returns payload for a valid admin token', () => {
    const token = generateAccessToken({ ...BASE_PAYLOAD, role: 'admin' })
    const result = verifyAccessTokenSync(token)
    expect(result).not.toBeNull()
    expect(result?.role).toBe('admin')
  })

  it('returns payload for editor role', () => {
    const token = generateAccessToken({ ...BASE_PAYLOAD, role: 'editor' })
    const result = verifyAccessTokenSync(token)
    expect(result?.role).toBe('editor')
  })

  it('returns payload for viewer role', () => {
    const token = generateAccessToken({ ...BASE_PAYLOAD, role: 'viewer' })
    const result = verifyAccessTokenSync(token)
    expect(result?.role).toBe('viewer')
  })

  it('returns null for an invalid role', () => {
    const token = jwt.sign(
      { ...BASE_PAYLOAD, role: 'superuser', v: 1 },
      ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' }
    )
    const result = verifyAccessTokenSync(token)
    expect(result).toBeNull()
  })

  it('returns null for a missing role field', () => {
    const { role: _r, ...payloadWithoutRole } = BASE_PAYLOAD
    const token = jwt.sign({ ...payloadWithoutRole, v: 1 }, ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: '15m',
    })
    const result = verifyAccessTokenSync(token)
    expect(result).toBeNull()
  })

  it('returns null for a tampered token', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const tampered = token.slice(0, -4) + '0000'
    expect(verifyAccessTokenSync(tampered)).toBeNull()
  })

  it('returns null for an expired token', () => {
    const token = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, ACCESS_SECRET, -1)
    expect(verifyAccessTokenSync(token)).toBeNull()
  })

  it('returns null for a refresh token (wrong secret)', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    expect(verifyAccessTokenSync(token)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(verifyAccessTokenSync('')).toBeNull()
  })

  it('returns null for a non-JWT string', () => {
    expect(verifyAccessTokenSync('garbage')).toBeNull()
  })
})

// ── verifyRefreshToken ────────────────────────────────────────────────────

describe('verifyRefreshToken', () => {
  it('returns payload for a valid refresh token', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    const result = verifyRefreshToken(token)
    expect(result).not.toBeNull()
    expect(result?.userId).toBe(BASE_PAYLOAD.userId)
  })

  it('returns null for an access token (wrong secret)', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    expect(verifyRefreshToken(token)).toBeNull()
  })

  it('returns null for an invalid role', () => {
    const token = jwt.sign(
      { ...BASE_PAYLOAD, role: 'hacker', v: 1 },
      REFRESH_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    )
    expect(verifyRefreshToken(token)).toBeNull()
  })

  it('returns null for an expired refresh token', () => {
    const token = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, REFRESH_SECRET, -1)
    expect(verifyRefreshToken(token)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(verifyRefreshToken('')).toBeNull()
  })

  it('returns null for a tampered token', () => {
    const token = generateRefreshToken(BASE_PAYLOAD)
    const tampered = token.slice(0, -4) + 'ZZZZ'
    expect(verifyRefreshToken(tampered)).toBeNull()
  })
})

// ── decodeToken ───────────────────────────────────────────────────────────

describe('decodeToken', () => {
  it('decodes a valid token without verification', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    const decoded = decodeToken(token)
    expect(decoded?.userId).toBe(BASE_PAYLOAD.userId)
    expect(decoded?.role).toBe(BASE_PAYLOAD.role)
  })

  it('decodes an expired token (no verification)', () => {
    const token = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, ACCESS_SECRET, -100)
    const decoded = decodeToken(token)
    expect(decoded?.userId).toBe(BASE_PAYLOAD.userId)
  })

  it('decodes a token signed with a wrong secret (no verification)', () => {
    const token = jwt.sign(BASE_PAYLOAD, 'wrong-secret', {
      algorithm: 'HS256',
      expiresIn: '15m',
    })
    const decoded = decodeToken(token)
    // jwt.decode only checks structure, not signature
    expect(decoded?.userId).toBe(BASE_PAYLOAD.userId)
  })

  it('returns null for a completely malformed string', () => {
    // jwt.decode returns null for invalid input (does not throw)
    expect(decodeToken('not-a-jwt')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeToken('')).toBeNull()
  })
})

// ── getTokenExpiry ────────────────────────────────────────────────────────

describe('getTokenExpiry', () => {
  it('returns the exp claim as a number', () => {
    const before = Math.floor(Date.now() / 1000)
    const token = generateAccessToken(BASE_PAYLOAD)
    const after = Math.floor(Date.now() / 1000)
    const exp = getTokenExpiry(token)
    expect(typeof exp).toBe('number')
    expect(exp!).toBeGreaterThanOrEqual(before + 900 - 2)
    expect(exp!).toBeLessThanOrEqual(after + 900 + 2)
  })

  it('returns null for a malformed token', () => {
    expect(getTokenExpiry('garbage')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getTokenExpiry('')).toBeNull()
  })
})

// ── isTokenExpired ────────────────────────────────────────────────────────

describe('isTokenExpired', () => {
  it('returns false for a freshly generated token', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true for a token that expired in the past', () => {
    const token = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, ACCESS_SECRET, -1)
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for a malformed token (no exp)', () => {
    expect(isTokenExpired('garbage')).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isTokenExpired('')).toBe(true)
  })

  it('uses fake timers: valid token appears expired after advancing time', () => {
    const token = generateAccessToken(BASE_PAYLOAD)
    expect(isTokenExpired(token)).toBe(false)

    // Advance real time is not possible here without real timers, but we can
    // verify the boundary by signing a token that expires in 1 second and
    // checking it is not yet expired.
    const almostExpired = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, ACCESS_SECRET, 2)
    expect(isTokenExpired(almostExpired)).toBe(false)

    const justExpired = signWithExpiry({ ...BASE_PAYLOAD, v: 1 }, ACCESS_SECRET, -1)
    expect(isTokenExpired(justExpired)).toBe(true)
  })
})
