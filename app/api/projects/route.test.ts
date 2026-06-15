import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFind } = vi.hoisted(() => ({
  mockFind: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('models/project', () => ({
  default: { find: mockFind },
  transformToProjects: vi.fn((docs) => docs),
}))

import { GET } from './route'

const fakeProject = {
  id: 'p1',
  title: 'My Project',
  slug: 'my-project',
  description: 'A project',
  coverImage: 'http://img',
  tags: [{ id: 't1', name: 'React' }],
  featured: true,
  status: 'completed' as const,
  isDraft: false,
}

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/projects')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

const makeChain = (data: unknown[]) => ({
  sort: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
})

describe('GET /api/projects', () => {
  beforeEach(() => {
    mockFind.mockReset()
  })

  it('returns 200 with published projects by default', async () => {
    mockFind.mockReturnValueOnce(makeChain([fakeProject]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(mockFind).toHaveBeenCalledWith({ isDraft: false })
  })

  it('returns all projects when fetchAll=true', async () => {
    const draftProject = { ...fakeProject, id: 'p2', isDraft: true }
    mockFind.mockReturnValueOnce(makeChain([fakeProject, draftProject]))

    const res = await GET(makeRequest({ fetchAll: 'true' }), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(2)
    expect(mockFind).toHaveBeenCalledWith({})
  })

  it('returns 200 with empty array when no projects exist', async () => {
    mockFind.mockReturnValueOnce(makeChain([]))

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual([])
  })

  it('returns 500 when DB throws', async () => {
    mockFind.mockImplementationOnce(() => {
      throw new Error('projects-db-error')
    })

    const res = await GET(makeRequest(), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('projects-db-error')
  })
})
