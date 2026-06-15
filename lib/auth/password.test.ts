import { describe, it, expect } from 'vitest'
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  isPasswordValid,
  generateRandomPassword,
} from './password'

describe('validatePasswordStrength', () => {
  it('requires a password', () => {
    expect(validatePasswordStrength('')).toEqual(['Password is required'])
  })

  it('accepts a strong password', () => {
    expect(validatePasswordStrength('Str0ng!Pass')).toEqual([])
  })

  it('flags missing length', () => {
    const errors = validatePasswordStrength('Ab1!')
    expect(errors.some((e) => e.includes('at least 8 characters'))).toBe(true)
  })

  it('flags missing uppercase, lowercase, number and special char individually', () => {
    expect(validatePasswordStrength('lowercase1!')).toContain(
      'Password must contain at least one uppercase letter'
    )
    expect(validatePasswordStrength('UPPERCASE1!')).toContain(
      'Password must contain at least one lowercase letter'
    )
    expect(validatePasswordStrength('NoNumbers!')).toContain(
      'Password must contain at least one number'
    )
    expect(validatePasswordStrength('NoSpecial1')).toContain(
      'Password must contain at least one special character'
    )
  })

  it('accumulates multiple errors', () => {
    // short, all-lowercase, no number, no special
    expect(validatePasswordStrength('abc').length).toBeGreaterThan(1)
  })
})

describe('isPasswordValid', () => {
  it('returns true only for compliant passwords', () => {
    expect(isPasswordValid('Str0ng!Pass')).toBe(true)
    expect(isPasswordValid('weak')).toBe(false)
  })
})

describe('generateRandomPassword', () => {
  it('generates a password of the requested length that passes validation', () => {
    for (let i = 0; i < 25; i++) {
      const pwd = generateRandomPassword(12)
      expect(pwd).toHaveLength(12)
      expect(isPasswordValid(pwd)).toBe(true)
    }
  })

  it('respects a custom length while keeping all character classes', () => {
    const pwd = generateRandomPassword(20)
    expect(pwd).toHaveLength(20)
    expect(isPasswordValid(pwd)).toBe(true)
  })
})

describe('hashPassword / comparePassword', () => {
  it('hashes a password to a non-plaintext bcrypt hash', async () => {
    const hash = await hashPassword('Str0ng!Pass')
    expect(hash).not.toBe('Str0ng!Pass')
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashPassword('Str0ng!Pass')
    const b = await hashPassword('Str0ng!Pass')
    expect(a).not.toBe(b)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('Str0ng!Pass')
    expect(await comparePassword('Str0ng!Pass', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Str0ng!Pass')
    expect(await comparePassword('wrong', hash)).toBe(false)
  })

  it('returns false (not throw) on a malformed hash', async () => {
    expect(await comparePassword('whatever', 'not-a-real-hash')).toBe(false)
  })

  it('serializes concurrent hashes correctly under the semaphore', async () => {
    const inputs = Array.from({ length: 8 }, (_, i) => `Str0ng!Pass${i}`)
    const hashes = await Promise.all(inputs.map((p) => hashPassword(p)))
    const checks = await Promise.all(inputs.map((p, i) => comparePassword(p, hashes[i])))
    expect(checks.every(Boolean)).toBe(true)
  })
})
