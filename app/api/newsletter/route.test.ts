import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFindOne, mockSave } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockSave: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('models/newsletter', () => {
  const MockModel = vi.fn().mockImplementation(() => ({
    save: mockSave,
    id: 'new-uuid',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  MockModel.findOne = mockFindOne
  return {
    default: MockModel,
    transformToNewsletter: vi.fn((doc) => ({
      id: doc.id,
      email: doc.email,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })),
  }
})

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    mockFindOne.mockReset()
    mockSave.mockReset()
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({}), undefined)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toMatch(/email is required/i)
  })

  it('returns 400 when body has empty email', async () => {
    const res = await POST(makeRequest({ email: '' }), undefined)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 200 when email already subscribed', async () => {
    mockFindOne.mockResolvedValueOnce({ email: 'existing@example.com' })
    const res = await POST(makeRequest({ email: 'existing@example.com' }), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toMatch(/already subscribed/i)
  })

  it('returns 201 when successfully subscribed', async () => {
    mockFindOne.mockResolvedValueOnce(null)
    mockSave.mockResolvedValueOnce(undefined)
    const res = await POST(makeRequest({ email: 'new@example.com' }), undefined)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toMatch(/successfully subscribed/i)
    expect(json.data).toBeDefined()
  })

  it('returns 500 when DB throws', async () => {
    mockFindOne.mockRejectedValueOnce(new Error('db exploded'))
    const res = await POST(makeRequest({ email: 'fail@example.com' }), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('db exploded')
  })

  it('does not leak stack trace in 500 response', async () => {
    mockFindOne.mockRejectedValueOnce(new Error('internal-secret'))
    const res = await POST(makeRequest({ email: 'x@y.com' }), undefined)
    const text = await res.text()
    expect(text).not.toContain('internal-secret')
  })
})
