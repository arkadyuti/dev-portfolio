import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RateLimitResult } from './rate-limit'

// ---------------------------------------------------------------------------
// Mock @/lib/redis
// ---------------------------------------------------------------------------
const mockEval = vi.fn()
const mockGet = vi.fn()
const mockTtl = vi.fn()
const mockDel = vi.fn()

const mockRedisClient = {
  status: 'ready' as string,
  eval: mockEval,
  get: mockGet,
  ttl: mockTtl,
  del: mockDel,
  connect: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/lib/redis', () => ({
  default: () => mockRedisClient,
  getRedisClient: () => mockRedisClient,
  getConnectedRedisClient: () => Promise.resolve(mockRedisClient),
}))

// Import AFTER mocks are registered
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  getClientIP,
  formatRateLimitError,
} from './rate-limit'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function makeResult(overrides: Partial<RateLimitResult> = {}): RateLimitResult {
  return {
    allowed: true,
    remaining: 5,
    resetAt: new Date(Date.now() + 60_000),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getClientIP
// ---------------------------------------------------------------------------
describe('getClientIP', () => {
  it('returns the first IP from a comma-separated x-forwarded-for list', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.0.1.2' })
    expect(getClientIP(headers)).toBe('1.2.3.4')
  })

  it('trims whitespace from the first x-forwarded-for IP', () => {
    const headers = new Headers({ 'x-forwarded-for': '  10.0.0.1 , 10.0.0.2' })
    expect(getClientIP(headers)).toBe('10.0.0.1')
  })

  it('returns a single x-forwarded-for value when no comma is present', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientIP(headers)).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.100' })
    expect(getClientIP(headers)).toBe('192.168.1.100')
  })

  it('falls back to x-client-ip when x-forwarded-for and x-real-ip are absent', () => {
    const headers = new Headers({ 'x-client-ip': '172.16.0.1' })
    expect(getClientIP(headers)).toBe('172.16.0.1')
  })

  it('returns "unknown" when no recognised header is present', () => {
    const headers = new Headers({})
    expect(getClientIP(headers)).toBe('unknown')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' })
    expect(getClientIP(headers)).toBe('1.1.1.1')
  })

  it('prefers x-real-ip over x-client-ip', () => {
    const headers = new Headers({ 'x-real-ip': '3.3.3.3', 'x-client-ip': '4.4.4.4' })
    expect(getClientIP(headers)).toBe('3.3.3.3')
  })
})

// ---------------------------------------------------------------------------
// formatRateLimitError
// ---------------------------------------------------------------------------
describe('formatRateLimitError', () => {
  it('produces singular "1 minute" for a 60-second retryAfter', () => {
    const result = makeResult({ allowed: false, retryAfter: 60 })
    const formatted = formatRateLimitError(result)
    expect(formatted.message).toBe('Too many attempts. Please try again in 1 minute.')
    expect(formatted.retryAfter).toBe(60)
  })

  it('produces plural "2 minutes" for a 90-second retryAfter', () => {
    const result = makeResult({ allowed: false, retryAfter: 90 })
    const formatted = formatRateLimitError(result)
    expect(formatted.message).toContain('2 minutes')
    expect(formatted.retryAfter).toBe(90)
  })

  it('rounds up partial minutes (1 second → 1 minute)', () => {
    const result = makeResult({ allowed: false, retryAfter: 1 })
    const formatted = formatRateLimitError(result)
    expect(formatted.message).toBe('Too many attempts. Please try again in 1 minute.')
  })

  it('rounds up 61 seconds to 2 minutes', () => {
    const result = makeResult({ allowed: false, retryAfter: 61 })
    const formatted = formatRateLimitError(result)
    expect(formatted.message).toContain('2 minutes')
  })

  it('handles missing retryAfter (undefined) gracefully', () => {
    const result = makeResult({ allowed: false, retryAfter: undefined })
    const formatted = formatRateLimitError(result)
    expect(formatted.retryAfter).toBe(0)
    // 0 seconds → ceil(0/60) = 0 minutes — plural form
    expect(formatted.message).toContain('0 minutes')
  })

  it('produces plural form for 5 minutes', () => {
    const result = makeResult({ allowed: false, retryAfter: 300 })
    const formatted = formatRateLimitError(result)
    expect(formatted.message).toBe('Too many attempts. Please try again in 5 minutes.')
  })
})

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------
describe('checkRateLimit', () => {
  beforeEach(() => {
    mockRedisClient.status = 'ready'
  })

  it('returns allowed=true with remaining count when the Lua script allows the request', async () => {
    // [allowed=1, remaining=4, ttl=900]
    mockEval.mockResolvedValue([1, 4, 900])

    const result = await checkRateLimit('user-1', 'login')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfter).toBeUndefined()
  })

  it('builds the Redis key as ratelimit:<type>:<identifier>', async () => {
    mockEval.mockResolvedValue([1, 99, 60])

    await checkRateLimit('192.168.1.1', 'api')

    // Second positional arg to eval is numkeys=1, then the key
    expect(mockEval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'ratelimit:api:192.168.1.1',
      expect.any(String),
      expect.any(String)
    )
  })

  it('passes maxAttempts and windowSeconds from the default config', async () => {
    mockEval.mockResolvedValue([1, 4, 900])

    await checkRateLimit('user-1', 'login')

    const callArgs = mockEval.mock.calls[0]
    // ARGV[1] = maxAttempts, ARGV[2] = windowSeconds
    expect(callArgs[3]).toBe('5')   // login maxAttempts
    expect(callArgs[4]).toBe('900') // login windowSeconds (15 * 60)
  })

  it('returns allowed=false with retryAfter when the Lua script blocks the request', async () => {
    // [allowed=0, remaining=0, ttl=542]
    mockEval.mockResolvedValue([0, 0, 542])

    const result = await checkRateLimit('bad-actor', 'login')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBe(542)
  })

  it('sets resetAt based on the TTL returned by Redis', async () => {
    const ttl = 300
    mockEval.mockResolvedValue([1, 3, ttl])
    const before = Date.now()

    const result = await checkRateLimit('u', 'api')

    const after = Date.now()
    const expectedMin = before + ttl * 1000
    const expectedMax = after + ttl * 1000
    expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
    expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedMax)
  })

  it('uses customConfig when provided', async () => {
    mockEval.mockResolvedValue([1, 9, 30])

    await checkRateLimit('u', 'api', { maxAttempts: 10, windowSeconds: 30 })

    const callArgs = mockEval.mock.calls[0]
    expect(callArgs[3]).toBe('10') // custom maxAttempts
    expect(callArgs[4]).toBe('30') // custom windowSeconds
  })

  it('fails open (allowed=true) when Redis throws', async () => {
    mockEval.mockRejectedValue(new Error('Connection refused'))

    const result = await checkRateLimit('user-x', 'api')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('attempts to connect when redis status is not ready', async () => {
    mockRedisClient.status = 'wait'
    mockEval.mockResolvedValue([1, 4, 60])

    await checkRateLimit('u', 'api')

    expect(mockRedisClient.connect).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// resetRateLimit
// ---------------------------------------------------------------------------
describe('resetRateLimit', () => {
  it('deletes the correct Redis key', async () => {
    mockDel.mockResolvedValue(1)

    await resetRateLimit('user-1', 'login')

    expect(mockDel).toHaveBeenCalledWith('ratelimit:login:user-1')
  })

  it('defaults to "api" type', async () => {
    mockDel.mockResolvedValue(1)

    await resetRateLimit('user-2')

    expect(mockDel).toHaveBeenCalledWith('ratelimit:api:user-2')
  })
})

// ---------------------------------------------------------------------------
// getRateLimitStatus
// ---------------------------------------------------------------------------
describe('getRateLimitStatus', () => {
  it('returns correct remaining and allowed when under the limit', async () => {
    mockGet.mockResolvedValue('2')
    mockTtl.mockResolvedValue(800)

    const result = await getRateLimitStatus('user-1', 'login')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(3) // maxAttempts(5) - count(2)
    expect(result.retryAfter).toBeUndefined()
  })

  it('returns allowed=false and retryAfter when at the limit', async () => {
    mockGet.mockResolvedValue('5')
    mockTtl.mockResolvedValue(400)

    const result = await getRateLimitStatus('user-1', 'login')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBe(400)
  })

  it('returns remaining=maxAttempts when key does not exist (null from redis)', async () => {
    mockGet.mockResolvedValue(null)
    mockTtl.mockResolvedValue(-2)

    const result = await getRateLimitStatus('new-user', 'api')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(100) // api default maxAttempts
  })

  it('uses windowSeconds for resetAt when TTL is negative', async () => {
    mockGet.mockResolvedValue(null)
    mockTtl.mockResolvedValue(-2)
    const before = Date.now()

    const result = await getRateLimitStatus('u', 'api')

    const after = Date.now()
    // windowSeconds for 'api' is 60
    const expectedMin = before + 60 * 1000
    const expectedMax = after + 60 * 1000
    expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
    expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedMax)
  })

  it('clamps remaining to 0 when count exceeds maxAttempts', async () => {
    mockGet.mockResolvedValue('200') // way over api limit of 100
    mockTtl.mockResolvedValue(30)

    const result = await getRateLimitStatus('heavy-user', 'api')

    expect(result.remaining).toBe(0)
    expect(result.allowed).toBe(false)
  })

  it('fails open when Redis throws', async () => {
    mockGet.mockRejectedValue(new Error('Redis gone'))

    const result = await getRateLimitStatus('user-x', 'api')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('uses customConfig when provided', async () => {
    mockGet.mockResolvedValue('3')
    mockTtl.mockResolvedValue(25)

    const result = await getRateLimitStatus('u', 'api', { maxAttempts: 10, windowSeconds: 30 })

    expect(result.remaining).toBe(7) // 10 - 3
    expect(result.allowed).toBe(true)
  })
})
