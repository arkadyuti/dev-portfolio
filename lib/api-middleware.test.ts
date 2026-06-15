import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Hoist mock state so vi.mock factories can reference it ────────────────────
// vi.mock() calls are hoisted to the top of the file by Vitest; any values
// they reference must be declared with vi.hoisted() to avoid temporal dead zone
// errors.

const { mockIsConnected, mockConnectToDatabase } = vi.hoisted(() => ({
  mockIsConnected: vi.fn(() => false as boolean),
  mockConnectToDatabase: vi.fn(async () => ({})),
}))

vi.mock('./mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ── Import after mocks are registered ────────────────────────────────────────

import { withDatabase, withMiddleware, type ApiRouteHandler } from './api-middleware'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(url = 'http://localhost/api/test') {
  return new NextRequest(url)
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('withDatabase', () => {
  beforeEach(() => {
    mockIsConnected.mockReturnValue(false)
    mockConnectToDatabase.mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls the handler and returns its response when DB is already connected', async () => {
    mockIsConnected.mockReturnValue(true)
    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ ok: true }))

    const wrapped = withDatabase(handler)
    const res = await wrapped(makeRequest())
    const body = await res.json()

    expect(handler).toHaveBeenCalledOnce()
    expect(body).toEqual({ ok: true })
    expect(mockConnectToDatabase).not.toHaveBeenCalled()
  })

  it('calls connectToDatabase when DB is not connected', async () => {
    mockIsConnected.mockReturnValue(false)
    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ ok: true }))

    const wrapped = withDatabase(handler)
    await wrapped(makeRequest())

    expect(mockConnectToDatabase).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('returns 503 JSON error when connectToDatabase throws a MongoDB error', async () => {
    mockIsConnected.mockReturnValue(false)
    mockConnectToDatabase.mockRejectedValueOnce(new Error('MongoDB connection failed'))
    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ ok: true }))

    const wrapped = withDatabase(handler)
    const res = await wrapped(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('DATABASE_ERROR')
    expect(handler).not.toHaveBeenCalled()
  })

  it('re-throws non-MongoDB errors from connectToDatabase', async () => {
    mockIsConnected.mockReturnValue(false)
    mockConnectToDatabase.mockRejectedValueOnce(new Error('some other error'))
    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ ok: true }))

    const wrapped = withDatabase(handler)
    await expect(wrapped(makeRequest())).rejects.toThrow('some other error')
  })

  it('re-throws errors thrown by the inner handler', async () => {
    mockIsConnected.mockReturnValue(true)
    const handler: ApiRouteHandler = vi.fn(async () => {
      throw new Error('handler exploded')
    })

    const wrapped = withDatabase(handler)
    await expect(wrapped(makeRequest())).rejects.toThrow('handler exploded')
  })

  it('passes request and context through to the handler', async () => {
    mockIsConnected.mockReturnValue(true)
    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ ok: true }))

    const req = makeRequest()
    const ctx = { params: Promise.resolve({ id: '42' }) }
    const wrapped = withDatabase(handler)
    await wrapped(req, ctx)

    expect(handler).toHaveBeenCalledWith(req, ctx)
  })
})

describe('withMiddleware', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('applies a single middleware', async () => {
    const order: string[] = []

    const middlewareA = (handler: ApiRouteHandler): ApiRouteHandler =>
      async (req, ctx) => {
        order.push('A-before')
        const res = await handler(req, ctx)
        order.push('A-after')
        return res
      }

    const handler: ApiRouteHandler = async () => {
      order.push('handler')
      return jsonResponse({ ok: true })
    }

    const composed = withMiddleware(middlewareA)(handler)
    await composed(makeRequest())

    expect(order).toEqual(['A-before', 'handler', 'A-after'])
  })

  it('applies multiple middlewares in correct order (outermost first)', async () => {
    const order: string[] = []

    const middlewareA = (handler: ApiRouteHandler): ApiRouteHandler =>
      async (req, ctx) => {
        order.push('A')
        return handler(req, ctx)
      }

    const middlewareB = (handler: ApiRouteHandler): ApiRouteHandler =>
      async (req, ctx) => {
        order.push('B')
        return handler(req, ctx)
      }

    const handler: ApiRouteHandler = async () => {
      order.push('handler')
      return jsonResponse({ ok: true })
    }

    const composed = withMiddleware(middlewareA, middlewareB)(handler)
    await composed(makeRequest())

    // reduceRight: A wraps B wraps handler — execution order: A → B → handler
    expect(order).toEqual(['A', 'B', 'handler'])
  })

  it('returns the final handler response through all layers', async () => {
    const identity = (handler: ApiRouteHandler): ApiRouteHandler => handler

    const handler: ApiRouteHandler = async () => jsonResponse({ value: 99 })

    const composed = withMiddleware(identity, identity)(handler)
    const res = await composed(makeRequest())
    const body = await res.json()

    expect(body).toEqual({ value: 99 })
  })

  it('composes withDatabase via withMiddleware correctly', async () => {
    mockIsConnected.mockReturnValue(true)

    const handler: ApiRouteHandler = vi.fn(async () => jsonResponse({ from: 'handler' }))
    const composed = withMiddleware(withDatabase)(handler)
    const res = await composed(makeRequest())
    const body = await res.json()

    expect(body).toEqual({ from: 'handler' })
    expect(handler).toHaveBeenCalledOnce()
  })
})
