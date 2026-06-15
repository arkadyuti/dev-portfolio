import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock factories
const mockBlogFindOne = vi.hoisted(() => vi.fn())
const mockBlogSave = vi.hoisted(() => vi.fn())
const mockUploadTempImage = vi.hoisted(() => vi.fn())
const mockMoveToFinalLocation = vi.hoisted(() => vi.fn())
const mockConnectToDatabase = vi.hoisted(() => vi.fn())
const mockIsConnected = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('models/blog', () => {
  const MockBlogModels = vi.fn().mockImplementation((data: unknown) => ({
    ...data,
    save: mockBlogSave,
  }))
  MockBlogModels.findOne = mockBlogFindOne
  return { default: MockBlogModels }
})

vi.mock('@/lib/image-upload', () => ({
  uploadTempImage: mockUploadTempImage,
  moveToFinalLocation: mockMoveToFinalLocation,
}))

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/auth/helpers', () => ({ getCurrentUser: vi.fn() }))

import { POST } from './route'
import { getCurrentUser } from '@/lib/auth/helpers'

const mockGetCurrentUser = vi.mocked(getCurrentUser)

function makeFormDataRequest(fields: Record<string, string>, file?: File) {
  const formData = new FormData()
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
  if (file) formData.append('coverImage', file)

  const req = new NextRequest('http://localhost/api/blog', { method: 'POST' })
  // Stub formData() to return our object directly. Round-tripping a File through
  // a real multipart body hangs under vitest/undici, so we bypass parsing.
  req.formData = async () => formData
  return req
}

const baseFields = {
  title: 'My Blog Post',
  author: 'John Doe',
  excerpt: 'A short excerpt',
  content: 'Full content here',
  contentRTE: JSON.stringify({ type: 'doc', content: [] }),
  contentImages: JSON.stringify([]),
  featured: 'false',
  tags: JSON.stringify(['tech', 'vitest']),
  isDraft: 'false',
}

const savedBlogDoc = {
  id: 'generated-uuid',
  ...baseFields,
  contentRTE: { type: 'doc', content: [] },
  contentImages: [],
  tags: ['tech', 'vitest'],
  featured: false,
  isDraft: false,
  coverImageKey: '',
  coverImage: '',
  save: vi.fn(),
}

beforeEach(() => {
  mockIsConnected.mockReturnValue(true)
  mockConnectToDatabase.mockResolvedValue(undefined)
  mockBlogFindOne.mockResolvedValue(null)
  mockBlogSave.mockResolvedValue({ ...savedBlogDoc })
  mockUploadTempImage.mockResolvedValue({
    coverImage: 'http://minio/temp/img.jpg',
    coverImageKey: 'temp-images/img.jpg',
    tempFilename: 'img.jpg',
  })
  mockMoveToFinalLocation.mockResolvedValue({
    coverImage: 'http://minio/blog-images/id/img.jpg',
    coverImageKey: 'blog-images/id/img.jpg',
  })
  savedBlogDoc.save.mockResolvedValue(savedBlogDoc)
  mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'admin@test.local', role: 'admin', sessionId: 's1' })
})

describe('POST /api/blog', () => {
  it('creates a new blog post without cover image', async () => {
    const req = makeFormDataRequest(baseFields)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('creates a new blog post with cover image', async () => {
    const file = new File(['img-content'], 'cover.jpg', { type: 'image/jpeg' })
    const req = makeFormDataRequest(baseFields, file)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockUploadTempImage).toHaveBeenCalledOnce()
    expect(mockMoveToFinalLocation).toHaveBeenCalledOnce()
  })

  it('updates existing blog when blogId query param provided', async () => {
    const existingBlog = { ...savedBlogDoc, id: 'existing-id', save: vi.fn().mockResolvedValue(savedBlogDoc) }
    mockBlogFindOne.mockResolvedValue(existingBlog)

    const url = new URL('http://localhost/api/blog?blogId=existing-id')
    const formData = new FormData()
    Object.entries(baseFields).forEach(([k, v]) => formData.append(k, v))
    const req = new NextRequest(url, { method: 'POST', body: formData })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(existingBlog.save).toHaveBeenCalled()
  })

  it('returns 404 when updating a non-existent blog', async () => {
    mockBlogFindOne.mockResolvedValue(null)

    const url = new URL('http://localhost/api/blog?blogId=non-existent')
    const formData = new FormData()
    Object.entries(baseFields).forEach(([k, v]) => formData.append(k, v))
    const req = new NextRequest(url, { method: 'POST', body: formData })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 500 when DB save fails', async () => {
    mockBlogSave.mockRejectedValue(new Error('DB error'))

    const req = makeFormDataRequest(baseFields)
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toMatch(/error.*message|stack/i)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    const req = makeFormDataRequest(baseFields)
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('does not call moveToFinalLocation when no cover image', async () => {
    const req = makeFormDataRequest(baseFields)
    await POST(req)
    expect(mockMoveToFinalLocation).not.toHaveBeenCalled()
  })
})
