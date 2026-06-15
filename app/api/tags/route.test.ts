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

vi.mock('models/blog', () => ({
  default: { find: mockBlogFind },
}))

vi.mock('models/project', () => ({
  default: { find: mockProjectFind },
}))

import { GET } from './route'

function makeRequest() {
  return new NextRequest('http://localhost/api/tags', { method: 'GET' })
}

const makeBlogQuery = (data: unknown[]) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
})

const makeProjectQuery = (data: unknown[]) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
})

describe('GET /api/tags', () => {
  beforeEach(() => {
    mockBlogFind.mockReset()
    mockProjectFind.mockReset()
  })

  it('returns 200 with merged unique tags from blogs and projects', async () => {
    mockBlogFind.mockReturnValueOnce(
      makeBlogQuery([
        { tags: [{ id: 'b1', name: 'TypeScript' }, { id: 'b2', name: 'React' }] },
      ])
    )
    mockProjectFind.mockReturnValueOnce(
      makeProjectQuery([
        { tags: [{ id: 'p1', name: 'React' }, { id: 'p2', name: 'Node.js' }] },
      ])
    )

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    const names = json.data.map((t: { name: string }) => t.name)
    // React appears in both — should be deduplicated
    expect(names).toContain('TypeScript')
    expect(names).toContain('React')
    expect(names).toContain('Node.js')
    expect(names.filter((n: string) => n === 'React').length).toBe(1)
  })

  it('returns 200 with empty array when no tags exist', async () => {
    mockBlogFind.mockReturnValueOnce(makeBlogQuery([]))
    mockProjectFind.mockReturnValueOnce(makeProjectQuery([]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual([])
  })

  it('assigns fallback id when tag has no id', async () => {
    mockBlogFind.mockReturnValueOnce(
      makeBlogQuery([{ tags: [{ name: 'NoId' }] }])
    )
    mockProjectFind.mockReturnValueOnce(makeProjectQuery([]))

    const res = await GET(makeRequest(), undefined)
    const json = await res.json()
    const tag = json.data.find((t: { name: string }) => t.name === 'NoId')
    expect(tag).toBeDefined()
    expect(tag.id).toMatch(/^tag-/)
  })

  it('returns 500 when DB throws', async () => {
    mockBlogFind.mockImplementationOnce(() => {
      throw new Error('tags-db-error')
    })
    mockProjectFind.mockReturnValueOnce(makeProjectQuery([]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('tags-db-error')
  })
})
