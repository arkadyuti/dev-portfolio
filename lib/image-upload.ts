import { v4 as uuidv4 } from 'uuid'
import { minioClient, uploadFile, makeFilePublic, getPublicFileUrl, deleteFile } from '@/lib/minio'
import { queueFileDeletion } from '@/lib/background-tasks'
import logger from '@/lib/logger'
import fs from 'fs'
import path from 'path'
import { processImage } from './image-utils'
import { logger as processLogger } from './logger'

interface ImageUploadConfig {
  bucketName: string
  file: File
  tempImagesPath: string
  finalImagesPath: string
  entityId: string
  oldImageKey?: string
}

interface ImageUploadResult {
  coverImageKey: string
  coverImage: string
}

interface TempUploadResult {
  tempFilename: string
  coverImageKey: string
  coverImage: string
}

export async function uploadTempImage({
  bucketName,
  file,
  tempImagesPath,
}: {
  bucketName: string
  file: File
  tempImagesPath: string
}): Promise<TempUploadResult> {
  logger.info('Starting temporary image upload', {
    bucketName,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  })

  try {
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    logger.info('File converted to buffer', { bufferSize: buffer.length })

    // Create a temporary filename with UUID
    const fileExtension = file.name.split('.').pop()
    const tempFilename = `${tempImagesPath}/temp_${uuidv4()}_cover-image.${fileExtension}`
    logger.info('Generated temporary filename', { tempFilename })

    // Upload to MinIO with metadata
    await uploadFile(bucketName, tempFilename, buffer, {
      'Content-Type': file.type || 'application/octet-stream',
      'Original-Name': file.name,
      'Upload-Date': new Date().toISOString(),
    })
    logger.info('Temporary file uploaded successfully', { tempFilename })

    return {
      tempFilename,
      coverImageKey: tempFilename,
      coverImage: getPublicFileUrl(bucketName, tempFilename),
    }
  } catch (error) {
    logger.error('Error in temporary image upload', {
      error: JSON.stringify(error),
      stack: error.stack,
      message: error.message,
    })
    throw error
  }
}

export async function moveToFinalLocation({
  bucketName,
  tempFilename,
  finalImagesPath,
  entityId,
  oldImageKey,
  file,
}: {
  bucketName: string
  tempFilename: string
  finalImagesPath: string
  entityId: string
  oldImageKey?: string
  file: File
}): Promise<ImageUploadResult> {
  logger.info('Starting move to final location', {
    tempFilename,
    entityId,
    oldImageKey,
  })

  const fileExtension = tempFilename.split('.').pop()
  const timestamp = Date.now()
  const finalFilename = `${finalImagesPath}/${entityId}_${timestamp}_cover-image.${fileExtension}`
  logger.info('Generated final filename', { finalFilename })

  try {
    // Get the temporary file
    logger.info('Fetching temporary file')
    const client = minioClient()
    const tempFile = await client.getObject(bucketName, tempFilename)
    const chunks: Buffer[] = []
    for await (const chunk of tempFile) {
      chunks.push(chunk)
    }
    const fileBuffer = Buffer.concat(chunks)
    logger.info('Temporary file fetched', { bufferSize: fileBuffer.length })

    // Upload the file to the final location
    logger.info('Uploading to final location')
    await uploadFile(bucketName, finalFilename, fileBuffer, {
      'Content-Type': file.type || 'application/octet-stream',
      'Original-Name': file.name || finalFilename,
      'Upload-Date': new Date().toISOString(),
    })
    logger.info('File uploaded to final location')

    // Make the new file public
    logger.info('Making file public')
    await makeFilePublic(bucketName, finalFilename)
    logger.info('File made public')

    // Delete the temporary file
    logger.info('Deleting temporary file')
    await deleteFile(bucketName, tempFilename)
    logger.info('Temporary file deleted')

    // Queue deletion of the old image if it exists and is different from the new one
    if (oldImageKey && oldImageKey !== finalFilename) {
      logger.info('Queueing old file for deletion', { oldImageKey })
      queueFileDeletion(bucketName, oldImageKey)
    }

    return {
      coverImageKey: finalFilename,
      coverImage: getPublicFileUrl(bucketName, finalFilename),
    }
  } catch (error) {
    logger.error('Error in move to final location', {
      error: JSON.stringify(error),
      stack: error.stack,
      message: error.message,
      tempFilename,
      finalFilename,
    })
    // If processing fails, we'll keep using the temporary file
    return {
      coverImageKey: tempFilename,
      coverImage: getPublicFileUrl(bucketName, tempFilename),
    }
  }
}

export async function processAndUploadImage(imagePath: string) {
  try {
    // Read the image file
    const buffer = fs.readFileSync(imagePath)

    // Process the image
    const processedBuffer = await processImage(buffer, {
      maxWidth: 1200,
      quality: 80,
      useMozjpeg: true,
      lossless: true,
    })

    // Get file extension and create filename
    const fileExtension = path.extname(imagePath).slice(1)
    const filename = `${path.basename(imagePath)}`
    const bucketName = process.env.MINIO_IMAGE_BUCKET || 'images'

    // Upload to MinIO
    await uploadFile(bucketName, filename, processedBuffer, {
      'Content-Type': `image/${fileExtension}`,
      'Original-Name': path.basename(imagePath),
      'Upload-Date': new Date().toISOString(),
      Processed: 'true',
      'Original-Size': buffer.length.toString(),
      'Processed-Size': processedBuffer.length.toString(),
    })

    // Make the file publicly accessible
    await makeFilePublic(bucketName, filename)

    // Get the public URL
    const fileUrl = getPublicFileUrl(bucketName, filename)

    processLogger.info('Image processed and uploaded successfully', {
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      url: fileUrl,
    })

    return fileUrl
  } catch (error) {
    processLogger.error('Error processing and uploading image', error)
    throw error
  }
}
