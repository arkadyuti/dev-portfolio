import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockProjectFindOne = vi.hoisted(() => vi.fn())
const mockProjectSave = vi.hoisted(() => vi.fn())
const mockUploadTempImage = vi.hoisted(() => vi.fn())
const mockMoveToFinalLocation = vi.hoisted(() => vi.fn())
const mockConnectToDatabase = vi.hoisted(() => vi.fn())
const mockIsConnected = vi.hoisted(() => vi.fn())

vi.mock('@/lib/mongodb', () => ({
  default: mockConnectToDatabase,
  isConnected: mockIsConnected,
}))

vi.mock('models/project', () => {
  const MockProjectModels = vi.fn().mockImplementation((data: unknown) => ({
    ...data,
    save: mockProjectSave,
  }))
  MockProjectModels.findOne = mockProjectFindOne
  return { default: MockProjectModels }
})

vi.mock('@/lib/image-upload', () => ({
  uploadTempImage: mockUploadTempImage,
  moveToFinalLocation: mockMoveToFinalLocation,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { POST } from './route'

function makeFormDataRequest(fields: Record<string, string>, file?: File) {
  const formData = new FormData()
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
  if (file) formData.append('coverImage', file)

  const req = new NextRequest('http://localhost/api/project', { method: 'POST' })
  // Stub formData() to return our object directly. Round-tripping a File through
  // a real multipart body hangs under vitest/undici, so we bypass parsing.
  req.formData = async () => formData
  return req
}

const baseFields = {
  title: 'My Project',
  description: 'A cool project',
  featured: 'false',
  tags: JSON.stringify(['nodejs', 'react']),
  isDraft: 'false',
  githubUrl: 'https://github.com/user/repo',
  liveUrl: 'https://myproject.com',
  status: 'completed',
}

const savedProjectDoc = {
  id: 'generated-uuid',
  ...baseFields,
  tags: ['nodejs', 'react'],
  featured: false,
  isDraft: false,
  coverImageKey: '',
  coverImage: '',
  save: vi.fn(),
}

beforeEach(() => {
  mockIsConnected.mockReturnValue(true)
  mockConnectToDatabase.mockResolvedValue(undefined)
  mockProjectFindOne.mockResolvedValue(null)
  mockProjectSave.mockResolvedValue({ ...savedProjectDoc })
  mockUploadTempImage.mockResolvedValue({
    coverImage: 'http://minio/temp/img.jpg',
    coverImageKey: 'temp-images/img.jpg',
    tempFilename: 'img.jpg',
  })
  mockMoveToFinalLocation.mockResolvedValue({
    coverImage: 'http://minio/project-images/id/img.jpg',
    coverImageKey: 'project-images/id/img.jpg',
  })
  savedProjectDoc.save.mockResolvedValue(savedProjectDoc)
})

describe('POST /api/project', () => {
  it('creates a new project without cover image', async () => {
    const req = makeFormDataRequest(baseFields)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockUploadTempImage).not.toHaveBeenCalled()
  })

  it('creates a new project with cover image', async () => {
    const file = new File(['img-bytes'], 'cover.jpg', { type: 'image/jpeg' })
    const req = makeFormDataRequest(baseFields, file)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockUploadTempImage).toHaveBeenCalledOnce()
    expect(mockMoveToFinalLocation).toHaveBeenCalledOnce()
  })

  it('updates an existing project when projectId query param provided', async () => {
    const existingProject = {
      ...savedProjectDoc,
      id: 'existing-proj',
      coverImageKey: '',
      save: vi.fn().mockResolvedValue(savedProjectDoc),
    }
    mockProjectFindOne.mockResolvedValue(existingProject)

    const url = new URL('http://localhost/api/project?projectId=existing-proj')
    const formData = new FormData()
    Object.entries(baseFields).forEach(([k, v]) => formData.append(k, v))
    const req = new NextRequest(url, { method: 'POST', body: formData })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(existingProject.save).toHaveBeenCalled()
  })

  it('returns 404 when updating nonexistent project', async () => {
    mockProjectFindOne.mockResolvedValue(null)

    const url = new URL('http://localhost/api/project?projectId=missing')
    const formData = new FormData()
    Object.entries(baseFields).forEach(([k, v]) => formData.append(k, v))
    const req = new NextRequest(url, { method: 'POST', body: formData })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 500 when DB save throws', async () => {
    mockProjectSave.mockRejectedValue(new Error('DB error'))
    const req = makeFormDataRequest(baseFields)
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('does not move image when no cover image provided', async () => {
    const req = makeFormDataRequest(baseFields)
    await POST(req)
    expect(mockMoveToFinalLocation).not.toHaveBeenCalled()
  })
})
