import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock factories
const mockBlogFindOne = vi.hoisted(() => vi.fn())
const mockBlogDeleteOne = vi.hoisted(() => vi.fn())
const mockTransformToBlog = vi.hoisted(() => vi.fn())
const mockQueueFileDeletion = vi.hoisted(() => vi.fn())
const mockQueueFileDeletions = vi.hoisted(() => vi.fn())
const mockConnectToDatabase = vi.hoisted(() => vi.fn())
const mockIsConnected = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('models/blog', () => ({
  default: {
    findOne: mockBlogFindOne,
    deleteOne: mockBlogDeleteOne,
  },
  transformToBlog: mockTransformToBlog,
}))

vi.mock('@/lib/background-tasks', () => ({
  queueFileDeletion: mockQueueFileDeletion,
  queueFileDeletions: mockQueueFileDeletions,
}))

import { GET, DELETE } from './route'

function makeRequest(method: string, id: string) {
  return {
    req: new NextRequest(`http://localhost/api/blog/${id}`, { method }),
    context: { params: Promise.resolve({ id }) },
  }
}

const mockBlogDoc = {
  id: 'blog-abc',
  title: 'Test Blog',
  author: 'Author',
  content: 'Content',
  coverImageKey: 'blog-images/blog-abc/cover.jpg',
  contentImages: ['blog-images/blog-abc/img1.jpg'],
  toObject: vi.fn().mockReturnValue({
    id: 'blog-abc',
    title: 'Test Blog',
  }),
}

const mockTransformedBlog = {
  id: 'blog-abc',
  title: 'Test Blog',
  author: 'Author',
}

beforeEach(() => {
  mockIsConnected.mockReturnValue(true)
  mockConnectToDatabase.mockResolvedValue(undefined)
  mockBlogFindOne.mockResolvedValue(mockBlogDoc)
  mockBlogDeleteOne.mockResolvedValue({ deletedCount: 1 })
  mockTransformToBlog.mockReturnValue(mockTransformedBlog)
  mockQueueFileDeletion.mockReturnValue(undefined)
  mockQueueFileDeletions.mockReturnValue(undefined)
})

describe('GET /api/blog/[id]', () => {
  it('returns 200 with blog data when found', async () => {
    const { req, context } = makeRequest('GET', 'blog-abc')
    const res = await GET(req, context)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('blog-abc')
  })

  it('returns 404 when blog not found', async () => {
    mockBlogFindOne.mockResolvedValue(null)
    const { req, context } = makeRequest('GET', 'nonexistent')
    const res = await GET(req, context)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toBe('Blog not found')
  })

  it('returns 404 (not 500) when blog not found — null safety bug regression', async () => {
    // Before fix: findOne returning null caused .toObject() TypeError -> 500
    mockBlogFindOne.mockResolvedValue(null)
    const { req, context } = makeRequest('GET', 'missing-id')
    const res = await GET(req, context)
    // Must be 404, not 500
    expect(res.status).toBe(404)
  })

  it('returns 500 on unexpected DB error', async () => {
    mockBlogFindOne.mockRejectedValue(new Error('DB error'))
    const { req, context } = makeRequest('GET', 'blog-abc')
    const res = await GET(req, context)
    expect(res.status).toBe(500)
  })

  it('returns 404 when transformToBlog returns null', async () => {
    mockTransformToBlog.mockReturnValue(null)
    const { req, context } = makeRequest('GET', 'blog-abc')
    const res = await GET(req, context)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/blog/[id]', () => {
  it('returns 200 when blog deleted successfully', async () => {
    const { req, context } = makeRequest('DELETE', 'blog-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 404 when blog not found', async () => {
    mockBlogFindOne.mockResolvedValue(null)
    const { req, context } = makeRequest('DELETE', 'missing-id')
    const res = await DELETE(req, context)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('queues cover image for deletion when it exists', async () => {
    const { req, context } = makeRequest('DELETE', 'blog-abc')
    await DELETE(req, context)
    expect(mockQueueFileDeletion).toHaveBeenCalledWith(
      process.env.MINIO_IMAGE_BUCKET,
      'blog-images/blog-abc/cover.jpg'
    )
  })

  it('queues content images for deletion when they exist', async () => {
    const { req, context } = makeRequest('DELETE', 'blog-abc')
    await DELETE(req, context)
    expect(mockQueueFileDeletions).toHaveBeenCalledWith(
      process.env.MINIO_IMAGE_BUCKET,
      ['blog-images/blog-abc/img1.jpg']
    )
  })

  it('does not queue image deletion when no cover image', async () => {
    mockBlogFindOne.mockResolvedValue({
      ...mockBlogDoc,
      coverImageKey: null,
      contentImages: [],
    })
    const { req, context } = makeRequest('DELETE', 'blog-abc')
    await DELETE(req, context)
    expect(mockQueueFileDeletion).not.toHaveBeenCalled()
    expect(mockQueueFileDeletions).not.toHaveBeenCalled()
  })

  it('returns 500 on unexpected error', async () => {
    mockBlogFindOne.mockRejectedValue(new Error('DB failure'))
    const { req, context } = makeRequest('DELETE', 'blog-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(500)
  })
})
