import { describe, it, expect } from 'vitest'

import {
  constantTimeCompare,
  generateSecureRandom,
  generateSecureToken,
} from '@/lib/auth/crypto-utils'

// ── constantTimeCompare ───────────────────────────────────────────────────

describe('constantTimeCompare', () => {
  // Happy path
  it('returns true for identical ASCII strings', () => {
    expect(constantTimeCompare('hello', 'hello')).toBe(true)
  })

  it('returns true for identical long strings', () => {
    const s = 'a'.repeat(1000)
    expect(constantTimeCompare(s, s)).toBe(true)
  })

  it('returns true for two empty strings', () => {
    expect(constantTimeCompare('', '')).toBe(true)
  })

  it('returns true for identical numeric strings', () => {
    expect(constantTimeCompare('12345', '12345')).toBe(true)
  })

  // Different content
  it('returns false for strings that differ in one character', () => {
    expect(constantTimeCompare('hello', 'hellx')).toBe(false)
  })

  it('returns false for completely different strings of equal length', () => {
    expect(constantTimeCompare('aaaa', 'bbbb')).toBe(false)
  })

  it('returns false for reversed strings', () => {
    expect(constantTimeCompare('abcd', 'dcba')).toBe(false)
  })

  // Length differences
  it('returns false when a is longer than b', () => {
    expect(constantTimeCompare('hello!', 'hello')).toBe(false)
  })

  it('returns false when b is longer than a', () => {
    expect(constantTimeCompare('hi', 'hi!')).toBe(false)
  })

  it('returns false when one string is empty and the other is not', () => {
    expect(constantTimeCompare('', 'x')).toBe(false)
    expect(constantTimeCompare('x', '')).toBe(false)
  })

  // Case sensitivity
  it('is case-sensitive', () => {
    expect(constantTimeCompare('Hello', 'hello')).toBe(false)
    expect(constantTimeCompare('ABC', 'abc')).toBe(false)
  })

  // Unicode
  it('returns true for identical unicode strings', () => {
    expect(constantTimeCompare('héllo', 'héllo')).toBe(true)
  })

  it('returns false for unicode strings that differ', () => {
    expect(constantTimeCompare('héllo', 'hello')).toBe(false)
  })

  it('handles emoji strings — equal', () => {
    expect(constantTimeCompare('🔑🔑', '🔑🔑')).toBe(true)
  })

  it('handles emoji strings — unequal', () => {
    expect(constantTimeCompare('🔑', '🗝️')).toBe(false)
  })

  // Special characters
  it('returns true for special character strings that are identical', () => {
    const s = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    expect(constantTimeCompare(s, s)).toBe(true)
  })

  // Null-byte strings (Edge case: Buffer.write stops at \0 in some encodings)
  it('treats strings with null bytes as equal when identical', () => {
    expect(constantTimeCompare('\0', '\0')).toBe(true)
  })
})

// ── generateSecureRandom ──────────────────────────────────────────────────

describe('generateSecureRandom', () => {
  it('returns a string', () => {
    expect(typeof generateSecureRandom()).toBe('string')
  })

  it('default length produces a 64-character hex string (32 bytes × 2)', () => {
    const result = generateSecureRandom()
    expect(result).toHaveLength(64)
  })

  it('is lowercase hex', () => {
    const result = generateSecureRandom()
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('custom length: 16 bytes → 32 hex chars', () => {
    expect(generateSecureRandom(16)).toHaveLength(32)
  })

  it('custom length: 64 bytes → 128 hex chars', () => {
    expect(generateSecureRandom(64)).toHaveLength(128)
  })

  it('length 1 → 2 hex chars', () => {
    expect(generateSecureRandom(1)).toHaveLength(2)
  })

  it('produces unique values on successive calls', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateSecureRandom()))
    // Probability of a collision with 32-byte random is negligible
    expect(results.size).toBe(20)
  })
})

// ── generateSecureToken ───────────────────────────────────────────────────

describe('generateSecureToken', () => {
  it('returns a string', () => {
    expect(typeof generateSecureToken()).toBe('string')
  })

  it('is URL-safe base64 (no +, /, or = characters)', () => {
    // Run multiple times to improve coverage of the character set
    for (let i = 0; i < 20; i++) {
      const result = generateSecureToken()
      expect(result).toMatch(/^[A-Za-z0-9\-_]+$/)
    }
  })

  it('default 32 bytes decodes to exactly 32 bytes via base64url', () => {
    const result = generateSecureToken()
    // base64url length for n bytes is ceil(n * 4/3) without padding
    // For 32 bytes: floor(32/3)*4 + (32%3 === 0 ? 0 : 32%3 === 1 ? 2 : 3) = 43 chars
    // More simply: check decoded byte length
    const decoded = Buffer.from(result, 'base64url')
    expect(decoded.length).toBe(32)
  })

  it('custom length: 16 bytes', () => {
    const result = generateSecureToken(16)
    const decoded = Buffer.from(result, 'base64url')
    expect(decoded.length).toBe(16)
  })

  it('custom length: 64 bytes', () => {
    const result = generateSecureToken(64)
    const decoded = Buffer.from(result, 'base64url')
    expect(decoded.length).toBe(64)
  })

  it('custom length: 1 byte', () => {
    const result = generateSecureToken(1)
    const decoded = Buffer.from(result, 'base64url')
    expect(decoded.length).toBe(1)
  })

  it('produces unique values on successive calls', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateSecureToken()))
    expect(results.size).toBe(20)
  })

  it('generateSecureRandom and generateSecureToken produce different encodings', () => {
    // Both use the same underlying randomBytes but encode differently
    // Just verify they don't look the same for a large output
    const random = generateSecureRandom(32)
    const token = generateSecureToken(32)
    // hex is purely [0-9a-f]; token is base64url — they should differ
    expect(random).toMatch(/^[0-9a-f]+$/)
    expect(token).not.toMatch(/^[0-9a-f]+$/) // base64url has uppercase/- too
  })
})
