/**
 * Tests for lib/image-utils.ts
 *
 * The file exports a single `processImage` function that wraps `sharp`.
 * Real binary image processing via sharp is not testable without actual image
 * buffers and the native sharp binary.  We mock `sharp` entirely and verify:
 *   - the correct sharp pipeline is invoked for each format
 *   - the resize step is applied only when maxWidth is exceeded
 *   - smaller processed output is returned; larger output falls back to original
 *   - on sharp error the original buffer is returned
 *
 * Untestable without real binaries: actual pixel-level output, format detection
 * from real binary headers, mozjpeg compression results.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Sharp mock
// ---------------------------------------------------------------------------
// We build a chainable mock: every method returns `this` (the same mock object)
// except `.toBuffer()` which returns the configured output buffer.
//
// `sharp()` itself is a factory that returns a new chainable instance each call
// EXCEPT that the test configures what `toBuffer()` resolves to.

let mockOutputBuffer: Buffer = Buffer.from('processed')
let mockMetadata: Record<string, unknown> = { format: 'png', width: 800, height: 600 }
let toBufferShouldThrow = false

function makeSharpInstance() {
  const instance: Record<string, unknown> = {}

  const chain = (name: string) => {
    instance[name] = vi.fn().mockReturnValue(instance)
    return instance
  }

  chain('resize')
  chain('png')
  chain('jpeg')
  chain('webp')

  instance.metadata = vi.fn().mockResolvedValue(mockMetadata)
  instance.toBuffer = vi.fn().mockImplementation(() => {
    if (toBufferShouldThrow) return Promise.reject(new Error('sharp internal error'))
    return Promise.resolve(mockOutputBuffer)
  })

  return instance
}

// The sharp mock needs to act as both a constructor-like factory and expose
// chainable methods from the returned object.
let currentSharpInstance: ReturnType<typeof makeSharpInstance>

vi.mock('sharp', () => {
  const factory = vi.fn().mockImplementation(() => {
    currentSharpInstance = makeSharpInstance()
    return currentSharpInstance
  })
  return { default: factory }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ORIGINAL = Buffer.from('original-image-bytes')

beforeEach(() => {
  vi.clearAllMocks()
  toBufferShouldThrow = false
  mockOutputBuffer = Buffer.from('processed-smaller') // shorter → "smaller"
  mockMetadata = { format: 'png', width: 800, height: 600 }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('processImage', () => {
  // We import lazily so the vi.mock above is set up first.
  async function getProcessImage() {
    const mod = await import('@/lib/image-utils')
    return mod.processImage
  }

  it('calls sharp.png() for PNG format', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 100, height: 100 }
    // Make processed buffer smaller so it gets returned
    mockOutputBuffer = Buffer.from('s') // 1 byte < ORIGINAL length

    const result = await processImage(ORIGINAL)
    expect(currentSharpInstance.png).toHaveBeenCalled()
    expect(currentSharpInstance.jpeg).not.toHaveBeenCalled()
    expect(result).toBe(mockOutputBuffer)
  })

  it('calls sharp.jpeg() for JPEG format', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'jpeg', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL)
    expect(currentSharpInstance.jpeg).toHaveBeenCalled()
    expect(currentSharpInstance.png).not.toHaveBeenCalled()
  })

  it('calls sharp.webp() for WebP format', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'webp', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL)
    expect(currentSharpInstance.webp).toHaveBeenCalled()
  })

  it('returns original buffer for unsupported formats', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'tiff', width: 100, height: 100 }

    const result = await processImage(ORIGINAL)
    expect(result).toBe(ORIGINAL)
    expect(currentSharpInstance.toBuffer).not.toHaveBeenCalled()
  })

  it('does NOT resize when maxWidth is not provided', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 2000, height: 1000 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL)
    expect(currentSharpInstance.resize).not.toHaveBeenCalled()
  })

  it('does NOT resize when image width is within maxWidth', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 500, height: 300 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL, { maxWidth: 800 })
    expect(currentSharpInstance.resize).not.toHaveBeenCalled()
  })

  it('resizes when image width exceeds maxWidth', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 1600, height: 900 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL, { maxWidth: 1200 })
    expect(currentSharpInstance.resize).toHaveBeenCalledWith({
      width: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    })
  })

  it('returns original buffer when processed output is larger', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 100, height: 100 }
    // Make processed output BIGGER than original
    mockOutputBuffer = Buffer.alloc(ORIGINAL.length + 100, 0xff)

    const result = await processImage(ORIGINAL)
    expect(result).toBe(ORIGINAL)
  })

  it('returns processed buffer when it is strictly smaller', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('tiny')

    const result = await processImage(ORIGINAL)
    expect(result).toBe(mockOutputBuffer)
  })

  it('returns original buffer on sharp error instead of throwing', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 100, height: 100 }
    toBufferShouldThrow = true

    const result = await processImage(ORIGINAL)
    expect(result).toBe(ORIGINAL)
  })

  it('passes compressionLevel and palette to png()', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'png', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL, { compressionLevel: 6 })
    expect(currentSharpInstance.png).toHaveBeenCalledWith(
      expect.objectContaining({ compressionLevel: 6, palette: true })
    )
  })

  it('passes quality and mozjpeg to jpeg()', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'jpeg', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL, { quality: 80, useMozjpeg: false })
    expect(currentSharpInstance.jpeg).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 80, mozjpeg: false })
    )
  })

  it('passes lossless to webp()', async () => {
    const processImage = await getProcessImage()
    mockMetadata = { format: 'webp', width: 100, height: 100 }
    mockOutputBuffer = Buffer.from('s')

    await processImage(ORIGINAL, { lossless: true })
    expect(currentSharpInstance.webp).toHaveBeenCalledWith(
      expect.objectContaining({ lossless: true })
    )
  })
})
