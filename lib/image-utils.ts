import sharp from 'sharp'

interface ImageProcessingOptions {
  maxWidth?: number
  compressionLevel?: number
  quality?: number
  useMozjpeg?: boolean
  lossless?: boolean
}

export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<Buffer> {
  try {
    const {
      maxWidth,
      compressionLevel = 9,
      quality = 92,
      useMozjpeg = true,
      lossless = false,
    } = options

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const originalSize = buffer.length

    // Only resize if maxWidth is provided and image is larger
    let processedImage = sharp(buffer)
    if (maxWidth && metadata.width && metadata.width > maxWidth) {
      processedImage = processedImage.resize({
        width: maxWidth,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    let processedBuffer: Buffer

    // For PNG images
    if (metadata.format === 'png') {
      processedBuffer = await processedImage
        .png({
          compressionLevel,
          palette: true,
        })
        .toBuffer()
    }
    // For JPEG images
    else if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      processedBuffer = await processedImage
        .jpeg({
          quality,
          mozjpeg: useMozjpeg,
          chromaSubsampling: '4:4:4',
          optimizeScans: true,
        })
        .toBuffer()
    }
    // For WebP images
    else if (metadata.format === 'webp') {
      processedBuffer = await processedImage
        .webp({
          lossless,
          quality: lossless ? undefined : quality,
          effort: 4,
        })
        .toBuffer()
    }
    // For other formats
    else {
      return buffer
    }

    // Only return processed buffer if it's actually smaller
    if (processedBuffer.length < originalSize) {
      return processedBuffer
    }

    // Return original if processing didn't reduce size
    return buffer
  } catch (error) {
    console.error('Error processing image:', error)
    return buffer // Return original buffer if processing fails
  }
}
