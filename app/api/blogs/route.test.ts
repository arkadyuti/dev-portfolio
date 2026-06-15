import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCountDocuments, mockFind } = vi.hoisted(() => ({
  mockCountDocuments: vi.fn(),
  mockFind: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('models/blog', () => ({
  default: {
    countDocuments: mockCountDocuments,
    find: mockFind,
  },
  transformToBlogs: vi.fn((docs) => docs),
}))

import { GET } from './route'

const fakeBlog = {
  id: 'b1',
  publishedAt: 1700000000,
  title: 'Hello World',
  excerpt: 'Excerpt',
  coverImage: 'http://img',
  author: 'Author',
  slug: 'hello-world',
  content: 'content',
  contentRTE: [],
  tags: [{ id: 't1', name: 'TypeScript' }],
  featured: false,
  isDraft: false,
  views: 0,
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/blogs')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

const makeChain = (data: unknown[]) => ({
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
})

describe('GET /api/blogs', () => {
  beforeEach(() => {
    mockCountDocuments.mockReset()
    mockFind.mockReset()
  })

  it('returns 200 with paginated blogs', async () => {
    mockCountDocuments.mockResolvedValueOnce(1)
    mockFind.mockReturnValueOnce(makeChain([fakeBlog]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.pagination).toBeDefined()
    expect(json.pagination.total).toBe(1)
    expect(json.pagination.page).toBe(1)
    expect(json.pagination.limit).toBe(10)
    expect(json.pagination.totalPages).toBe(1)
  })

  it('returns 404 when no blogs found', async () => {
    mockCountDocuments.mockResolvedValueOnce(0)
    mockFind.mockReturnValueOnce(makeChain([]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toMatch(/no blogs found/i)
  })

  it('respects page and limit query params', async () => {
    mockCountDocuments.mockResolvedValueOnce(30)
    mockFind.mockReturnValueOnce(makeChain([fakeBlog]))

    const res = await GET(makeRequest({ page: '2', limit: '5' }), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pagination.page).toBe(2)
    expect(json.pagination.limit).toBe(5)
    expect(json.pagination.totalPages).toBe(6)
  })

  it('excludes drafts on the default (public) listing — no fetchAll param', async () => {
    mockCountDocuments.mockResolvedValueOnce(1)
    mockFind.mockReturnValueOnce(makeChain([fakeBlog]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    // Security: the public listing must filter out drafts.
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ isDraft: false }))
  })

  it('excludes drafts for any fetchAll value other than "true"', async () => {
    mockCountDocuments.mockResolvedValueOnce(1)
    mockFind.mockReturnValueOnce(makeChain([fakeBlog]))

    const res = await GET(makeRequest({ fetchAll: '' }), undefined)
    expect(res.status).toBe(200)
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ isDraft: false }))
  })

  it('includes drafts only when fetchAll=true (admin listing)', async () => {
    mockCountDocuments.mockResolvedValueOnce(2)
    mockFind.mockReturnValueOnce(makeChain([fakeBlog, { ...fakeBlog, id: 'b2', isDraft: true }]))

    const res = await GET(makeRequest({ fetchAll: 'true' }), undefined)
    expect(res.status).toBe(200)
    // Admin call: no isDraft filter applied (drafts included).
    expect(mockFind).toHaveBeenCalledWith({})
  })

  it('returns 500 when DB throws', async () => {
    mockCountDocuments.mockRejectedValueOnce(new Error('count-error'))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('count-error')
  })
})
