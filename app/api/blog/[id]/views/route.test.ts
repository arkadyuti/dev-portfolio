import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFindOne, mockFindOneAndUpdate } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('models/blog', () => ({
  default: {
    findOne: mockFindOne,
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}))

import { POST, GET } from './route'

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makePostRequest(id: string) {
  return new NextRequest(`http://localhost/api/blog/${id}/views`, {
    method: 'POST',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

function makeGetRequest(id: string) {
  return new NextRequest(`http://localhost/api/blog/${id}/views`, { method: 'GET' })
}

describe('POST /api/blog/[id]/views', () => {
  beforeEach(() => {
    mockFindOne.mockReset()
    mockFindOneAndUpdate.mockReset()
  })

  it('returns 200 with updated view count', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ id: 'b1', views: 5 }) })
    mockFindOneAndUpdate.mockResolvedValueOnce({ id: 'b1', views: 6 })

    const res = await POST(makePostRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.views).toBe(6)
    expect(json.data.id).toBe('b1')
  })

  it('returns 404 when blog not found on initial check', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(null) })

    const res = await POST(makePostRequest('missing'), makeContext('missing'))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toMatch(/not found/i)
  })

  it('returns 404 when findOneAndUpdate returns null', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ id: 'b1', views: 0 }) })
    mockFindOneAndUpdate.mockResolvedValueOnce(null)

    const res = await POST(makePostRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(404)
  })

  it('returns 500 when DB throws', async () => {
    mockFindOne.mockImplementationOnce(() => {
      throw new Error('views-post-error')
    })

    const res = await POST(makePostRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('views-post-error')
  })
})

describe('GET /api/blog/[id]/views', () => {
  beforeEach(() => {
    mockFindOne.mockReset()
  })

  it('returns 200 with view count for existing blog', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ id: 'b1', views: 42 }) })

    const res = await GET(makeGetRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.views).toBe(42)
    expect(json.data.id).toBe('b1')
  })

  it('defaults views to 0 when field is missing', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ id: 'b1' }) })

    const res = await GET(makeGetRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.views).toBe(0)
  })

  it('returns 404 when blog not found', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(null) })

    const res = await GET(makeGetRequest('missing'), makeContext('missing'))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toMatch(/not found/i)
  })

  it('returns 500 when DB throws', async () => {
    mockFindOne.mockImplementationOnce(() => {
      throw new Error('views-get-error')
    })

    const res = await GET(makeGetRequest('b1'), makeContext('b1'))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('views-get-error')
  })
})
