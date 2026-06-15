import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockProjectFindOne = vi.hoisted(() => vi.fn())
const mockProjectDeleteOne = vi.hoisted(() => vi.fn())
const mockTransformToProject = vi.hoisted(() => vi.fn())
const mockDeleteFile = vi.hoisted(() => vi.fn())
const mockConnectToDatabase = vi.hoisted(() => vi.fn())
const mockIsConnected = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('models/project', () => ({
  default: {
    findOne: mockProjectFindOne,
    deleteOne: mockProjectDeleteOne,
  },
  transformToProject: mockTransformToProject,
}))

// The GET handler uses findOne().lean() chaining for GET,
// but uses findOne() directly (no .lean()) for DELETE.
// We set up the chain in beforeEach.

vi.mock('@/lib/minio', () => ({
  deleteFile: mockDeleteFile,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/auth/helpers', () => ({
  getCurrentUser: vi.fn(),
}))

import { GET, DELETE } from './route'
import { getCurrentUser } from '@/lib/auth/helpers'

const mockGetCurrentUser = vi.mocked(getCurrentUser)

function makeRequest(method: string, id: string) {
  return {
    req: new NextRequest(`http://localhost/api/project/${id}`, { method }),
    context: { params: Promise.resolve({ id }) },
  }
}

const mockProjectLean = {
  id: 'proj-abc',
  title: 'Test Project',
  description: 'Description',
  coverImageKey: 'project-images/proj-abc/cover.jpg',
}

const mockTransformedProject = {
  id: 'proj-abc',
  title: 'Test Project',
}

// For DELETE, findOne returns a full document (not lean)
const mockProjectDoc = {
  id: 'proj-abc',
  title: 'Test Project',
  coverImageKey: 'project-images/proj-abc/cover.jpg',
}

beforeEach(() => {
  mockIsConnected.mockReturnValue(true)
  mockConnectToDatabase.mockResolvedValue(undefined)
  // GET route uses findOne({ id }).lean() — mock the chain
  mockProjectFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockProjectLean) })
  mockProjectDeleteOne.mockResolvedValue({ deletedCount: 1 })
  mockTransformToProject.mockReturnValue(mockTransformedProject)
  mockDeleteFile.mockResolvedValue(undefined)
  mockGetCurrentUser.mockResolvedValue({
    id: 'u1',
    email: 'admin@test.local',
    role: 'admin',
    sessionId: 's1',
  })
})

describe('GET /api/project/[id]', () => {
  it('returns 200 with project data when found', async () => {
    const { req, context } = makeRequest('GET', 'proj-abc')
    const res = await GET(req, context)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('proj-abc')
  })

  it('returns 404 when project not found', async () => {
    mockProjectFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
    const { req, context } = makeRequest('GET', 'missing-id')
    const res = await GET(req, context)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toBe('Project not found')
  })

  it('returns 500 on unexpected error', async () => {
    mockProjectFindOne.mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) })
    const { req, context } = makeRequest('GET', 'proj-abc')
    const res = await GET(req, context)
    expect(res.status).toBe(500)
  })

  it('calls transformToProject with lean document', async () => {
    const { req, context } = makeRequest('GET', 'proj-abc')
    await GET(req, context)
    expect(mockTransformToProject).toHaveBeenCalledWith(mockProjectLean)
  })
})

describe('DELETE /api/project/[id]', () => {
  beforeEach(() => {
    // DELETE handler uses findOne({ id }) without .lean() - override the chain mock
    mockProjectFindOne.mockResolvedValue(mockProjectDoc)
  })

  it('returns 200 when project deleted successfully', async () => {
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 404 when project not found', async () => {
    mockProjectFindOne.mockResolvedValue(null)
    const { req, context } = makeRequest('DELETE', 'missing-id')
    const res = await DELETE(req, context)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('deletes cover image from MinIO when it exists', async () => {
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    await DELETE(req, context)
    expect(mockDeleteFile).toHaveBeenCalledWith(
      process.env.MINIO_IMAGE_BUCKET,
      'project-images/proj-abc/cover.jpg'
    )
  })

  it('does not attempt to delete image when coverImageKey is absent', async () => {
    mockProjectFindOne.mockResolvedValue({ ...mockProjectDoc, coverImageKey: null })
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    await DELETE(req, context)
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it('still deletes project from DB even if image deletion fails', async () => {
    mockDeleteFile.mockRejectedValue(new Error('MinIO down'))
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(200)
    expect(mockProjectDeleteOne).toHaveBeenCalledWith({ id: 'proj-abc' })
  })

  it('returns 500 on unexpected DB error during DELETE', async () => {
    mockProjectFindOne.mockRejectedValue(new Error('DB failure'))
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(500)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null)
    const { req, context } = makeRequest('DELETE', 'proj-abc')
    const res = await DELETE(req, context)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.message).toBe('Unauthorized')
  })
})
