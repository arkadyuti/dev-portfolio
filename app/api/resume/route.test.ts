import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockFindOne,
  mockSave,
  mockGetCurrentUser,
  mockUploadFile,
  mockMakeFilePublic,
  mockGetPublicFileUrl,
  mockDeleteFile,
} = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockSave: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockUploadFile: vi.fn(),
  mockMakeFilePublic: vi.fn(),
  mockGetPublicFileUrl: vi.fn(),
  mockDeleteFile: vi.fn(),
}))

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue({}),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/models/resume', () => {
  const MockResumeConstructor = vi.fn().mockImplementation(() => ({ save: mockSave }))
  MockResumeConstructor.findOne = mockFindOne
  return {
    default: MockResumeConstructor,
    transformToResume: vi.fn((doc) => doc),
  }
})

vi.mock('@/lib/auth/helpers', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

vi.mock('@/lib/minio', () => ({
  uploadFile: mockUploadFile,
  makeFilePublic: mockMakeFilePublic,
  getPublicFileUrl: mockGetPublicFileUrl,
  deleteFile: mockDeleteFile,
}))

import { GET, POST } from './route'

const fakeResume = {
  id: 'r1',
  fileName: 'resume.pdf',
  fileKey: 'resume/resume_123.pdf',
  fileUrl: 'http://minio/resume.pdf',
  fileSize: 1024,
  uploadedAt: Date.now(),
  mimeType: 'application/pdf',
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/resume', { method: 'GET' })
}

/**
 * Build a POST NextRequest whose formData() returns a controlled mock.
 * We spy on formData so the test doesn't need to parse real multipart bytes,
 * which hangs in the jsdom environment.
 */
function makePostRequest(fileOrNull: File | null) {
  const req = new NextRequest('http://localhost/api/resume', { method: 'POST' })
  const fd = new FormData()
  if (fileOrNull) fd.append('file', fileOrNull)
  vi.spyOn(req, 'formData').mockResolvedValue(fd)
  return req
}

function makePdfFile(sizeBytes = 1024, name = 'resume.pdf', type = 'application/pdf') {
  const buffer = new Uint8Array(sizeBytes)
  return new File([buffer], name, { type })
}

describe('GET /api/resume', () => {
  beforeEach(() => {
    mockFindOne.mockReset()
  })

  it('returns 200 with resume data when resume exists', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(fakeResume) })

    const res = await GET(makeGetRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
  })

  it('returns 200 with null data when no resume exists', async () => {
    mockFindOne.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(null) })

    const res = await GET(makeGetRequest(), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toBeNull()
  })

  it('returns 500 when DB throws on GET', async () => {
    mockFindOne.mockImplementationOnce(() => {
      throw new Error('get-resume-error')
    })

    const res = await GET(makeGetRequest(), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('get-resume-error')
  })
})

describe('POST /api/resume', () => {
  beforeEach(() => {
    mockFindOne.mockReset()
    mockSave.mockReset()
    mockGetCurrentUser.mockReset()
    mockUploadFile.mockReset()
    mockMakeFilePublic.mockReset()
    mockGetPublicFileUrl.mockReset()
    mockDeleteFile.mockReset()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null)

    const res = await POST(makePostRequest(makePdfFile()), undefined)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 400 when no file provided', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })

    const res = await POST(makePostRequest(null), undefined)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error.message).toMatch(/no file/i)
  })

  it('returns 400 when file is not PDF', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })
    const txtFile = makePdfFile(500, 'doc.txt', 'text/plain')

    const res = await POST(makePostRequest(txtFile), undefined)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error.message).toMatch(/pdf/i)
  })

  it('returns 400 when file exceeds 10MB', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })
    const bigFile = makePdfFile(11 * 1024 * 1024) // 11MB

    const res = await POST(makePostRequest(bigFile), undefined)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error.message).toMatch(/10mb/i)
  })

  it('uploads and creates new resume when none exists', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })
    mockUploadFile.mockResolvedValueOnce(undefined)
    mockMakeFilePublic.mockResolvedValueOnce(undefined)
    mockGetPublicFileUrl.mockReturnValueOnce('http://minio/resume.pdf')
    mockFindOne
      .mockResolvedValueOnce(null) // existingResume check
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(fakeResume) }) // final fetch
    mockSave.mockResolvedValueOnce(undefined)

    const res = await POST(makePostRequest(makePdfFile()), undefined)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('updates existing resume and deletes old file', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })
    mockUploadFile.mockResolvedValueOnce(undefined)
    mockMakeFilePublic.mockResolvedValueOnce(undefined)
    mockGetPublicFileUrl.mockReturnValueOnce('http://minio/resume_new.pdf')

    const existingDoc = {
      fileName: 'old.pdf',
      fileKey: 'resume/old.pdf',
      fileUrl: 'http://minio/old.pdf',
      fileSize: 512,
      uploadedAt: Date.now() - 1000,
      mimeType: 'application/pdf',
      save: mockSave,
    }

    mockFindOne
      .mockResolvedValueOnce(existingDoc) // existingResume = await ResumeModel.findOne({})
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(fakeResume) }) // final fetch

    mockSave.mockResolvedValueOnce(undefined)
    mockDeleteFile.mockResolvedValueOnce(undefined)

    const res = await POST(makePostRequest(makePdfFile()), undefined)
    expect(res.status).toBe(200)
    expect(mockDeleteFile).toHaveBeenCalledWith(expect.any(String), 'resume/old.pdf')
  })

  it('returns 500 when upload throws', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'u1', role: 'admin' })
    mockUploadFile.mockRejectedValueOnce(new Error('minio-error'))
    // findOne for existing resume check
    mockFindOne.mockResolvedValueOnce(null)

    const res = await POST(makePostRequest(makePdfFile()), undefined)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(JSON.stringify(json)).not.toContain('minio-error')
  })
})
