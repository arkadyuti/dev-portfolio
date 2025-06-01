import sharp from 'sharp'
import { logger } from './logger'

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

    logger.info('Processing image with options', {
      maxWidth,
      compressionLevel,
      quality,
      useMozjpeg,
      lossless,
    })

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const originalSize = buffer.length

    logger.info('Original image metadata', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: originalSize,
    })

    // Only resize if maxWidth is provided and image is larger
    let processedImage = sharp(buffer)
    if (maxWidth && metadata.width && metadata.width > maxWidth) {
      processedImage = processedImage.resize({
        width: maxWidth,
        fit: 'inside',
        withoutEnlargement: true,
      })
      logger.info('Resizing image to width', { maxWidth })
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
      logger.info('Processed PNG image', { compressionLevel })
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
      logger.info('Processed JPEG image', { quality, useMozjpeg })
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
      logger.info('Processed WebP image', { lossless, quality })
    }
    // For other formats
    else {
      logger.info('Unsupported format, returning original', { format: metadata.format })
      return buffer
    }

    const processedSize = processedBuffer.length
    const compressionRatio = ((originalSize - processedSize) / originalSize) * 100

    logger.info('Image processing results', {
      originalSize,
      processedSize,
      compressionRatio: `${compressionRatio.toFixed(2)}%`,
    })

    // Only return processed buffer if it's actually smaller
    if (processedBuffer.length < originalSize) {
      logger.info('Using processed image (smaller size)')
      return processedBuffer
    }

    // Return original if processing didn't reduce size
    logger.info('Using original image (processing did not reduce size)')
    return buffer
  } catch (error) {
    logger.error('Error processing image', error)
    return buffer // Return original buffer if processing fails
  }
}
