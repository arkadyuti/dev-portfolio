/**
 * Tests for lib/image-upload.ts
 *
 * Covers:
 *  - uploadTempImage: filename generation, upload call, returned URLs
 *  - moveToFinalLocation: final filename generation, happy path ordering,
 *    old-image queue, error fallback returning temp URL
 *  - processAndUploadImage: reads file, processes it, uploads and makes public
 *
 * Untestable without real binaries / filesystem / network:
 *  - actual MinIO I/O (mocked)
 *  - sharp image processing (mocked via image-utils mock)
 *  - fs.readFileSync on real paths (mocked)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// uuid — always return a predictable value
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid-1234') }))

// minio module functions used by image-upload
const mockUploadFile = vi.fn()
const mockMakeFilePublic = vi.fn()
const mockGetPublicFileUrl = vi.fn(
  (bucket: string, file: string) => `https://minio.test.local/${bucket}/${file}`
)
const mockDeleteFile = vi.fn()
const mockGetObject = vi.fn()
const mockMinioClient = vi.fn().mockReturnValue({ getObject: mockGetObject })

vi.mock('@/lib/minio', () => ({
  uploadFile: mockUploadFile,
  makeFilePublic: mockMakeFilePublic,
  getPublicFileUrl: mockGetPublicFileUrl,
  deleteFile: mockDeleteFile,
  minioClient: mockMinioClient,
}))

// background-tasks
const mockQueueFileDeletion = vi.fn()
vi.mock('@/lib/background-tasks', () => ({ queueFileDeletion: mockQueueFileDeletion }))

// image-utils
const mockProcessImage = vi.fn().mockImplementation(async (buf: Buffer) => buf)
vi.mock('./image-utils', () => ({ processImage: mockProcessImage }))

// fs
const mockReadFileSync = vi.fn()
vi.mock('fs', () => ({ default: { readFileSync: mockReadFileSync } }))

// path — keep real behaviour but ensure we can test
// (no need to mock; path is pure)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, content: string, type = 'image/png'): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// ---------------------------------------------------------------------------
// uploadTempImage
// ---------------------------------------------------------------------------
describe('uploadTempImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadFile.mockResolvedValue(undefined)
  })

  it('generates a temp filename with uuid and preserves extension', async () => {
    const { uploadTempImage } = await import('@/lib/image-upload')
    const file = makeFile('photo.jpg', 'data')

    const result = await uploadTempImage({
      bucketName: 'portfolio',
      file,
      tempImagesPath: 'uploads/temp',
    })

    expect(result.tempFilename).toMatch(
      /^uploads\/temp\/temp_test-uuid-1234_cover-image\.jpg$/
    )
  })

  it('coverImageKey equals tempFilename', async () => {
    const { uploadTempImage } = await import('@/lib/image-upload')
    const file = makeFile('photo.png', 'data')

    const result = await uploadTempImage({
      bucketName: 'portfolio',
      file,
      tempImagesPath: 'uploads/temp',
    })

    expect(result.coverImageKey).toBe(result.tempFilename)
  })

  it('coverImage is the public URL for the temp file', async () => {
    const { uploadTempImage } = await import('@/lib/image-upload')
    const file = makeFile('photo.png', 'data')

    const result = await uploadTempImage({
      bucketName: 'portfolio',
      file,
      tempImagesPath: 'uploads/temp',
    })

    // Expected: mock getPublicFileUrl returns `https://minio.test.local/<bucket>/<file>`.
    // uuid is mocked to 'test-uuid-1234', so tempFilename is predictable.
    expect(result.coverImage).toBe(
      'https://minio.test.local/portfolio/uploads/temp/temp_test-uuid-1234_cover-image.png'
    )
  })

  it('calls uploadFile with correct bucket, path, buffer, and metadata', async () => {
    const { uploadTempImage } = await import('@/lib/image-upload')
    const file = makeFile('img.png', 'abc', 'image/png')

    await uploadTempImage({ bucketName: 'portfolio', file, tempImagesPath: 'tmp' })

    expect(mockUploadFile).toHaveBeenCalledTimes(1)
    const [bucket, filename, buffer, meta] = mockUploadFile.mock.calls[0]
    expect(bucket).toBe('portfolio')
    expect(filename).toMatch(/^tmp\/temp_/)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(meta['Content-Type']).toBe('image/png')
    expect(meta['Original-Name']).toBe('img.png')
    expect(meta['Upload-Date']).toBeDefined()
  })

  it('rethrows errors from uploadFile', async () => {
    const { uploadTempImage } = await import('@/lib/image-upload')
    mockUploadFile.mockRejectedValue(new Error('upload failed'))

    await expect(
      uploadTempImage({ bucketName: 'portfolio', file: makeFile('f.jpg', 'd'), tempImagesPath: 'tmp' })
    ).rejects.toThrow('upload failed')
  })
})

// ---------------------------------------------------------------------------
// moveToFinalLocation
// ---------------------------------------------------------------------------
describe('moveToFinalLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // getObject returns a readable async iterable
    const chunk = Buffer.from('file-content')
    mockGetObject.mockResolvedValue(
      (async function* () {
        yield chunk
      })()
    )
    mockUploadFile.mockResolvedValue(undefined)
    mockMakeFilePublic.mockResolvedValue('https://public-url')
    mockDeleteFile.mockResolvedValue(undefined)
  })

  it('generates final filename with entityId and extension from tempFilename', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')
    const before = Date.now()

    const result = await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.png',
      finalImagesPath: 'uploads/final',
      entityId: 'entity-42',
      file: makeFile('photo.png', 'data'),
    })

    const after = Date.now()

    // Pattern: <finalImagesPath>/<entityId>_<timestamp>_cover-image.<ext>
    expect(result.coverImageKey).toMatch(
      /^uploads\/final\/entity-42_\d+_cover-image\.png$/
    )

    // Filename format: uploads/final/entity-42_<timestamp>_cover-image.png
    // The path segment before the first underscore includes the dir, so we split
    // on '/' first to get the basename, then on '_' to isolate the timestamp.
    const basename = result.coverImageKey.split('/').pop()!
    const ts = parseInt(basename.split('_')[1], 10)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('uploads final file, makes it public, deletes temp file (in that order)', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')
    const calls: string[] = []

    mockUploadFile.mockImplementation(async () => {
      calls.push('upload')
    })
    mockMakeFilePublic.mockImplementation(async () => {
      calls.push('makePublic')
      return 'url'
    })
    mockDeleteFile.mockImplementation(async () => {
      calls.push('delete')
    })

    await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.jpg',
      finalImagesPath: 'final',
      entityId: 'eid',
      file: makeFile('f.jpg', 'd'),
    })

    expect(calls).toEqual(['upload', 'makePublic', 'delete'])
  })

  it('queues old image for deletion when oldImageKey differs from final', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')

    await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.jpg',
      finalImagesPath: 'final',
      entityId: 'eid',
      oldImageKey: 'final/old-image.jpg',
      file: makeFile('f.jpg', 'd'),
    })

    expect(mockQueueFileDeletion).toHaveBeenCalledWith(
      'portfolio',
      'final/old-image.jpg'
    )
  })

  it('does NOT queue old image for deletion when oldImageKey is absent', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')

    await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.jpg',
      finalImagesPath: 'final',
      entityId: 'eid',
      file: makeFile('f.jpg', 'd'),
    })

    expect(mockQueueFileDeletion).not.toHaveBeenCalled()
  })

  it('returns temp URL as fallback when an error occurs during processing', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')
    mockUploadFile.mockRejectedValue(new Error('upload error'))

    const result = await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.jpg',
      finalImagesPath: 'final',
      entityId: 'eid',
      file: makeFile('f.jpg', 'd'),
    })

    expect(result.coverImageKey).toBe('tmp/temp_uuid_cover-image.jpg')
    expect(result.coverImage).toBe(
      mockGetPublicFileUrl('portfolio', 'tmp/temp_uuid_cover-image.jpg')
    )
  })

  it('coverImage equals public URL of the final filename on success', async () => {
    const { moveToFinalLocation } = await import('@/lib/image-upload')

    const result = await moveToFinalLocation({
      bucketName: 'portfolio',
      tempFilename: 'tmp/temp_uuid_cover-image.png',
      finalImagesPath: 'final',
      entityId: 'eid',
      file: makeFile('f.png', 'd'),
    })

    expect(result.coverImage).toBe(
      mockGetPublicFileUrl('portfolio', result.coverImageKey)
    )
  })
})

// ---------------------------------------------------------------------------
// processAndUploadImage
// ---------------------------------------------------------------------------
describe('processAndUploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadFileSync.mockReturnValue(Buffer.from('raw-image-data'))
    mockProcessImage.mockImplementation(async (buf: Buffer) => buf)
    mockUploadFile.mockResolvedValue(undefined)
    mockMakeFilePublic.mockResolvedValue('https://public-url')
  })

  it('reads the file, processes it, uploads to MinIO and returns public URL', async () => {
    const { processAndUploadImage } = await import('@/lib/image-upload')

    const url = await processAndUploadImage('/some/path/photo.jpg')

    expect(mockReadFileSync).toHaveBeenCalledWith('/some/path/photo.jpg')
    expect(mockProcessImage).toHaveBeenCalled()
    expect(mockUploadFile).toHaveBeenCalled()
    expect(mockMakeFilePublic).toHaveBeenCalled()
    expect(url).toContain('photo.jpg')
  })

  it('uses MINIO_IMAGE_BUCKET env var for bucket name', async () => {
    const { processAndUploadImage } = await import('@/lib/image-upload')
    // setup.ts sets MINIO_IMAGE_BUCKET='portfolio'

    await processAndUploadImage('/path/img.png')

    const [bucket] = mockUploadFile.mock.calls[0]
    expect(bucket).toBe('portfolio')
  })

  it('falls back to "images" bucket when MINIO_IMAGE_BUCKET is unset', async () => {
    const saved = process.env.MINIO_IMAGE_BUCKET
    delete process.env.MINIO_IMAGE_BUCKET

    // Need fresh import so the module re-evaluates the env var
    vi.resetModules()
    // Re-register mocks for the fresh module graph
    vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid-1234') }))
    vi.mock('@/lib/minio', () => ({
      uploadFile: mockUploadFile,
      makeFilePublic: mockMakeFilePublic,
      getPublicFileUrl: mockGetPublicFileUrl,
      deleteFile: mockDeleteFile,
      minioClient: mockMinioClient,
    }))
    vi.mock('@/lib/background-tasks', () => ({ queueFileDeletion: mockQueueFileDeletion }))
    vi.mock('./image-utils', () => ({ processImage: mockProcessImage }))
    vi.mock('fs', () => ({ default: { readFileSync: mockReadFileSync } }))

    const { processAndUploadImage: pAndU } = await import('@/lib/image-upload')
    await pAndU('/path/img.png')

    const [bucket] = mockUploadFile.mock.calls[0]
    expect(bucket).toBe('images')

    process.env.MINIO_IMAGE_BUCKET = saved
  })

  it('propagates errors from readFileSync', async () => {
    const { processAndUploadImage } = await import('@/lib/image-upload')
    mockReadFileSync.mockImplementation(() => { throw new Error('file not found') })

    await expect(processAndUploadImage('/bad/path.jpg')).rejects.toThrow('file not found')
  })
})
