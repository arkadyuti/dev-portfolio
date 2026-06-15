import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockBlogFind, mockProjectFind } = vi.hoisted(() => ({
  mockBlogFind: vi.fn(),
  mockProjectFind: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/models/blog', () => ({
  default: { find: mockBlogFind },
  transformToBlogs: vi.fn((docs) => docs),
}))

vi.mock('@/models/project', () => ({
  default: { find: mockProjectFind },
  transformToProjects: vi.fn((docs) => docs),
}))

import { GET } from './route'

const fakeBlog = {
  id: 'b1',
  publishedAt: 1700000000,
  title: 'Hello World',
  excerpt: 'A post',
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

const fakeProject = {
  id: 'p1',
  title: 'My Project',
  slug: 'my-project',
  description: 'A project',
  coverImage: 'http://img',
  tags: [{ id: 't2', name: 'React' }],
  featured: false,
  status: 'completed' as const,
  isDraft: false,
}

function makeRequest(q?: string) {
  const url = q
    ? `http://localhost/api/search?q=${encodeURIComponent(q)}`
    : 'http://localhost/api/search'
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/search', () => {
  beforeEach(() => {
    mockBlogFind.mockReset()
    mockProjectFind.mockReset()
  })

  it('returns empty results when no query provided', async () => {
    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.blogs).toEqual([])
    expect(json.data.projects).toEqual([])
  })

  it('returns matched blogs and projects for a query', async () => {
    mockBlogFind.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([fakeBlog]) })
    mockProjectFind.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([fakeProject]) })

    const res = await GET(makeRequest('hello'), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.blogs).toHaveLength(1)
    expect(json.data.projects).toHaveLength(1)
  })

  it('returns empty arrays when nothing matches', async () => {
    mockBlogFind.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) })
    mockProjectFind.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) })

    const res = await GET(makeRequest('zzz-no-match'), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.blogs).toEqual([])
    expect(json.data.projects).toEqual([])
  })

  it('returns 500 when DB throws', async () => {
    mockBlogFind.mockImplementationOnce(() => {
      throw new Error('search-db-error')
    })

    const res = await GET(makeRequest('error'), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('search-db-error')
  })
})
