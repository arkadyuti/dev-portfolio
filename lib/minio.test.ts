/**
 * Tests for lib/minio.ts
 *
 * The module uses lazy singleton state (`minioClient`, `initializationAttempted`)
 * at module level.  To isolate tests we call `vi.resetModules()` in `beforeEach`
 * and re-import the module under test dynamically in every test.  Because
 * `vi.mock()` is hoisted, we make the `Client` constructor read its
 * implementation from a module-level variable (`mockClientInstance`) that we
 * replace before each test – this lets us configure per-test spy behaviour
 * without re-hoisting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Stable mock client reference — replaced before every test.
// ---------------------------------------------------------------------------
let mockClientInstance: {
  bucketExists: ReturnType<typeof vi.fn>
  makeBucket: ReturnType<typeof vi.fn>
  putObject: ReturnType<typeof vi.fn>
  presignedGetObject: ReturnType<typeof vi.fn>
  removeObject: ReturnType<typeof vi.fn>
  getBucketPolicy: ReturnType<typeof vi.fn>
  setBucketPolicy: ReturnType<typeof vi.fn>
  getObject: ReturnType<typeof vi.fn>
}

function makeMockClient() {
  return {
    bucketExists: vi.fn(),
    makeBucket: vi.fn(),
    putObject: vi.fn(),
    presignedGetObject: vi.fn(),
    removeObject: vi.fn(),
    getBucketPolicy: vi.fn(),
    setBucketPolicy: vi.fn(),
    getObject: vi.fn(),
  }
}

// Hoisted mock — the factory closure captures `mockClientInstance` by reference,
// so replacing the variable before each test automatically changes what the
// constructor produces.
vi.mock('minio', () => ({
  Client: vi.fn().mockImplementation(() => mockClientInstance),
}))

// ---------------------------------------------------------------------------
// Reset the module registry and create a fresh mock client before every test.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetModules()
  mockClientInstance = makeMockClient()
})

afterEach(() => {
  vi.clearAllMocks()
  // Guard: some tests delete MINIO_ENDPOINT to exercise the unconfigured path.
  // Restore it unconditionally so a throw mid-test can't leak into later tests.
  process.env.MINIO_ENDPOINT = 'minio.test.local'
})

// ---------------------------------------------------------------------------
// getPublicFileUrl — pure, no singleton involved
// ---------------------------------------------------------------------------
describe('getPublicFileUrl', () => {
  it('builds https URL by default when MINIO_PUBLIC_PROTOCOL is unset', async () => {
    delete process.env.MINIO_PUBLIC_PROTOCOL
    const { getPublicFileUrl } = await import('@/lib/minio')
    // MINIO_ENDPOINT is set by test/setup.ts → 'minio.test.local'
    expect(getPublicFileUrl('portfolio', 'images/photo.jpg')).toBe(
      'https://minio.test.local/portfolio/images/photo.jpg'
    )
  })

  it('respects MINIO_PUBLIC_PROTOCOL override', async () => {
    process.env.MINIO_PUBLIC_PROTOCOL = 'http'
    const { getPublicFileUrl } = await import('@/lib/minio')
    const url = getPublicFileUrl('portfolio', 'images/photo.jpg')
    delete process.env.MINIO_PUBLIC_PROTOCOL
    expect(url).toBe('http://minio.test.local/portfolio/images/photo.jpg')
  })

  it('includes bucket and fileName path segments', async () => {
    const { getPublicFileUrl } = await import('@/lib/minio')
    expect(getPublicFileUrl('my-bucket', 'path/to/file.png')).toContain(
      '/my-bucket/path/to/file.png'
    )
  })
})

// ---------------------------------------------------------------------------
// getMinioClient (exported as `minioClient`)
// ---------------------------------------------------------------------------
describe('getMinioClient', () => {
  it('throws on the FIRST call when MINIO_ENDPOINT is not set', async () => {
    delete process.env.MINIO_ENDPOINT // afterEach restores it
    const { minioClient } = await import('@/lib/minio')
    // Fixed behaviour: no MINIO_ENDPOINT => throw immediately (previously it
    // returned null on the first call, crashing callers downstream).
    expect(() => minioClient()).toThrow('MinIO client not initialized')
  })

  it('keeps throwing on subsequent calls when MINIO_ENDPOINT is not set', async () => {
    delete process.env.MINIO_ENDPOINT // afterEach restores it
    const { minioClient } = await import('@/lib/minio')
    expect(() => minioClient()).toThrow('MinIO client not initialized')
    expect(() => minioClient()).toThrow('MinIO client not initialized')
  })

  it('returns the mock client when MINIO_ENDPOINT is set', async () => {
    const { minioClient } = await import('@/lib/minio')
    const client = minioClient()
    expect(client).toBe(mockClientInstance)
  })

  it('returns the same singleton on repeated calls', async () => {
    const { minioClient } = await import('@/lib/minio')
    expect(minioClient()).toBe(minioClient())
  })
})

// ---------------------------------------------------------------------------
// ensureBucket
// ---------------------------------------------------------------------------
describe('ensureBucket', () => {
  it('does NOT call makeBucket when bucket already exists', async () => {
    mockClientInstance.bucketExists.mockResolvedValue(true)
    const { ensureBucket } = await import('@/lib/minio')
    await ensureBucket('portfolio')
    expect(mockClientInstance.makeBucket).not.toHaveBeenCalled()
  })

  it('calls makeBucket when bucket does not exist', async () => {
    mockClientInstance.bucketExists.mockResolvedValue(false)
    mockClientInstance.makeBucket.mockResolvedValue(undefined)
    const { ensureBucket } = await import('@/lib/minio')
    await ensureBucket('new-bucket')
    expect(mockClientInstance.makeBucket).toHaveBeenCalledWith('new-bucket')
  })

  it('maps EPROTO error to friendly network message', async () => {
    const err = Object.assign(new Error('ssl error'), { code: 'EPROTO' })
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { ensureBucket } = await import('@/lib/minio')
    await expect(ensureBucket('portfolio')).rejects.toThrow(
      'Network error connecting to MinIO'
    )
  })

  it('maps ECONNREFUSED error to friendly network message', async () => {
    const err = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' })
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { ensureBucket } = await import('@/lib/minio')
    await expect(ensureBucket('portfolio')).rejects.toThrow(
      'Network error connecting to MinIO'
    )
  })

  it('maps AccessDenied error to access-denied message', async () => {
    const err = Object.assign(new Error('Access Denied'), { code: 'AccessDenied' })
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { ensureBucket } = await import('@/lib/minio')
    await expect(ensureBucket('portfolio')).rejects.toThrow(
      'Access denied: Check your MINIO_KEY and MINIO_SECRET configuration.'
    )
  })

  it('maps InvalidAccessKeyId error to access-denied message', async () => {
    const err = Object.assign(new Error('Invalid Key'), { code: 'InvalidAccessKeyId' })
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { ensureBucket } = await import('@/lib/minio')
    await expect(ensureBucket('portfolio')).rejects.toThrow('Access denied')
  })

  it('rethrows unknown errors as-is', async () => {
    const err = new Error('some unexpected error')
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { ensureBucket } = await import('@/lib/minio')
    await expect(ensureBucket('portfolio')).rejects.toBe(err)
  })
})

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------
describe('uploadFile', () => {
  it('calls ensureBucket then putObject with correct args', async () => {
    mockClientInstance.bucketExists.mockResolvedValue(true)
    mockClientInstance.putObject.mockResolvedValue({ etag: 'abc' })
    const { uploadFile } = await import('@/lib/minio')

    const buf = Buffer.from('hello')
    const meta = { 'Content-Type': 'image/png' }
    await uploadFile('portfolio', 'images/photo.png', buf, meta)

    expect(mockClientInstance.bucketExists).toHaveBeenCalledWith('portfolio')
    expect(mockClientInstance.putObject).toHaveBeenCalledWith(
      'portfolio',
      'images/photo.png',
      buf,
      buf.length,
      meta
    )
  })

  it('uses empty metadata object when none provided', async () => {
    mockClientInstance.bucketExists.mockResolvedValue(true)
    mockClientInstance.putObject.mockResolvedValue({})
    const { uploadFile } = await import('@/lib/minio')

    const buf = Buffer.from('data')
    await uploadFile('portfolio', 'file.jpg', buf)

    expect(mockClientInstance.putObject).toHaveBeenCalledWith(
      'portfolio',
      'file.jpg',
      buf,
      buf.length,
      {}
    )
  })

  it('propagates errors from putObject', async () => {
    mockClientInstance.bucketExists.mockResolvedValue(true)
    const err = new Error('put failed')
    mockClientInstance.putObject.mockRejectedValue(err)
    const { uploadFile } = await import('@/lib/minio')

    await expect(uploadFile('portfolio', 'f.jpg', Buffer.from('x'))).rejects.toBe(err)
  })

  it('propagates errors from ensureBucket', async () => {
    const err = Object.assign(new Error('conn refused'), { code: 'ECONNREFUSED' })
    mockClientInstance.bucketExists.mockRejectedValue(err)
    const { uploadFile } = await import('@/lib/minio')

    await expect(uploadFile('portfolio', 'f.jpg', Buffer.from('x'))).rejects.toThrow(
      'Network error connecting to MinIO'
    )
  })
})

// ---------------------------------------------------------------------------
// getPresignedUrl
// ---------------------------------------------------------------------------
describe('getPresignedUrl', () => {
  it('calls presignedGetObject with defaults', async () => {
    mockClientInstance.presignedGetObject.mockResolvedValue('https://signed-url')
    const { getPresignedUrl } = await import('@/lib/minio')

    const url = await getPresignedUrl('portfolio', 'file.jpg')
    expect(mockClientInstance.presignedGetObject).toHaveBeenCalledWith(
      'portfolio',
      'file.jpg',
      604800 // 7 * 24 * 60 * 60
    )
    expect(url).toBe('https://signed-url')
  })

  it('forwards custom expiry', async () => {
    mockClientInstance.presignedGetObject.mockResolvedValue('https://short')
    const { getPresignedUrl } = await import('@/lib/minio')

    await getPresignedUrl('portfolio', 'file.jpg', 300)
    expect(mockClientInstance.presignedGetObject).toHaveBeenCalledWith(
      'portfolio',
      'file.jpg',
      300
    )
  })

  it('rethrows errors', async () => {
    const err = new Error('presign failed')
    mockClientInstance.presignedGetObject.mockRejectedValue(err)
    const { getPresignedUrl } = await import('@/lib/minio')

    await expect(getPresignedUrl('portfolio', 'f.jpg')).rejects.toBe(err)
  })
})

// ---------------------------------------------------------------------------
// deleteFile
// ---------------------------------------------------------------------------
describe('deleteFile', () => {
  it('calls removeObject with correct args', async () => {
    mockClientInstance.removeObject.mockResolvedValue(undefined)
    const { deleteFile } = await import('@/lib/minio')

    await deleteFile('portfolio', 'images/old.jpg')
    expect(mockClientInstance.removeObject).toHaveBeenCalledWith('portfolio', 'images/old.jpg')
  })

  it('propagates errors', async () => {
    const err = new Error('remove failed')
    mockClientInstance.removeObject.mockRejectedValue(err)
    const { deleteFile } = await import('@/lib/minio')

    await expect(deleteFile('portfolio', 'file.jpg')).rejects.toBe(err)
  })
})

// ---------------------------------------------------------------------------
// makeFilePublic — new policy branch (NoSuchBucketPolicy)
// ---------------------------------------------------------------------------
describe('makeFilePublic — new policy (NoSuchBucketPolicy)', () => {
  it('creates a fresh policy and adds resource when no existing policy', async () => {
    const noPolicyErr = Object.assign(new Error('no policy'), {
      code: 'NoSuchBucketPolicy',
    })
    mockClientInstance.getBucketPolicy.mockRejectedValue(noPolicyErr)
    mockClientInstance.setBucketPolicy.mockResolvedValue(undefined)
    const { makeFilePublic } = await import('@/lib/minio')

    const url = await makeFilePublic('portfolio', 'images/photo.jpg')

    expect(mockClientInstance.setBucketPolicy).toHaveBeenCalledTimes(1)
    const [calledBucket, policyJson] = mockClientInstance.setBucketPolicy.mock.calls[0]
    expect(calledBucket).toBe('portfolio')

    const policy = JSON.parse(policyJson)
    expect(policy.Version).toBe('2012-10-17')
    expect(policy.Statement).toHaveLength(1)
    const stmt = policy.Statement[0]
    expect(stmt.Effect).toBe('Allow')
    expect(stmt.Principal.AWS).toContain('*')
    expect(stmt.Action).toContain('s3:GetObject')
    expect(stmt.Resource).toContain('arn:aws:s3:::portfolio/images/photo.jpg')
    expect(url).toContain('portfolio/images/photo.jpg')
  })
})

// ---------------------------------------------------------------------------
// makeFilePublic — merge with existing policy
// ---------------------------------------------------------------------------
describe('makeFilePublic — merge with existing policy', () => {
  it('appends resource to existing Allow/s3:GetObject statement', async () => {
    const existingPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: ['arn:aws:s3:::portfolio/images/existing.jpg'],
        },
      ],
    }
    mockClientInstance.getBucketPolicy.mockResolvedValue(JSON.stringify(existingPolicy))
    mockClientInstance.setBucketPolicy.mockResolvedValue(undefined)
    const { makeFilePublic } = await import('@/lib/minio')

    await makeFilePublic('portfolio', 'images/new.jpg')

    const [, policyJson] = mockClientInstance.setBucketPolicy.mock.calls[0]
    const policy = JSON.parse(policyJson)
    expect(policy.Statement).toHaveLength(1)
    const resources = policy.Statement[0].Resource
    expect(resources).toContain('arn:aws:s3:::portfolio/images/existing.jpg')
    expect(resources).toContain('arn:aws:s3:::portfolio/images/new.jpg')
  })

  it('does not duplicate a resource already in the policy', async () => {
    const resource = 'arn:aws:s3:::portfolio/images/photo.jpg'
    const existingPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [resource],
        },
      ],
    }
    mockClientInstance.getBucketPolicy.mockResolvedValue(JSON.stringify(existingPolicy))
    mockClientInstance.setBucketPolicy.mockResolvedValue(undefined)
    const { makeFilePublic } = await import('@/lib/minio')

    await makeFilePublic('portfolio', 'images/photo.jpg')

    const [, policyJson] = mockClientInstance.setBucketPolicy.mock.calls[0]
    const policy = JSON.parse(policyJson)
    const resources = policy.Statement[0].Resource
    expect(resources.filter((r: string) => r === resource)).toHaveLength(1)
  })

  it('creates a new Allow statement when existing policy has no matching statement', async () => {
    const existingPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: { AWS: ['*'] },
          Action: ['s3:DeleteObject'],
          Resource: ['arn:aws:s3:::portfolio/*'],
        },
      ],
    }
    mockClientInstance.getBucketPolicy.mockResolvedValue(JSON.stringify(existingPolicy))
    mockClientInstance.setBucketPolicy.mockResolvedValue(undefined)
    const { makeFilePublic } = await import('@/lib/minio')

    await makeFilePublic('portfolio', 'images/photo.jpg')

    const [, policyJson] = mockClientInstance.setBucketPolicy.mock.calls[0]
    const policy = JSON.parse(policyJson)
    expect(policy.Statement).toHaveLength(2)
    const allowStmt = policy.Statement.find((s: { Effect: string }) => s.Effect === 'Allow')
    expect(allowStmt).toBeDefined()
    expect(allowStmt.Resource).toContain('arn:aws:s3:::portfolio/images/photo.jpg')
  })

  it('normalises string Resource to array before appending', async () => {
    const existingPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          // deliberately a string, not an array
          Resource: 'arn:aws:s3:::portfolio/images/old.jpg',
        },
      ],
    }
    mockClientInstance.getBucketPolicy.mockResolvedValue(JSON.stringify(existingPolicy))
    mockClientInstance.setBucketPolicy.mockResolvedValue(undefined)
    const { makeFilePublic } = await import('@/lib/minio')

    await makeFilePublic('portfolio', 'images/new.jpg')

    const [, policyJson] = mockClientInstance.setBucketPolicy.mock.calls[0]
    const policy = JSON.parse(policyJson)
    const resources = policy.Statement[0].Resource
    expect(Array.isArray(resources)).toBe(true)
    expect(resources).toContain('arn:aws:s3:::portfolio/images/new.jpg')
  })

  it('rethrows non-NoSuchBucketPolicy errors from getBucketPolicy', async () => {
    const err = Object.assign(new Error('forbidden'), { code: 'AccessDenied' })
    mockClientInstance.getBucketPolicy.mockRejectedValue(err)
    const { makeFilePublic } = await import('@/lib/minio')

    await expect(makeFilePublic('portfolio', 'file.jpg')).rejects.toBe(err)
  })
})
