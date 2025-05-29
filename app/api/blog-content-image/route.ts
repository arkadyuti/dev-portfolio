import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, makeFilePublic, getPublicFileUrl } from '@/lib/minio'
import { processImage } from '@/lib/image-utils'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Process image with very high quality settings
    const processedBuffer = await processImage(buffer, {
      maxWidth: 1500,
      quality: 92, // Very high quality
      useMozjpeg: true, // Use mozjpeg for better JPEG compression
    })

    // Create a filename with UUID and place in blocknote-images directory
    const fileExtension = file.name.split('.').pop()
    const filename = `content-images/content_${uuidv4()}.${fileExtension}`
    const bucketName = process.env.MINIO_IMAGE_BUCKET

    // Upload to MinIO with metadata
    await uploadFile(bucketName, filename, processedBuffer, {
      'Content-Type': file.type || 'application/octet-stream',
      'Original-Name': file.name,
      'Upload-Date': new Date().toISOString(),
      Processed: 'true',
      'Original-Size': buffer.length.toString(),
      'Processed-Size': processedBuffer.length.toString(),
    })

    // Make the file publicly accessible
    await makeFilePublic(bucketName, filename)

    // Get the public URL
    const fileUrl = getPublicFileUrl(bucketName, filename)

    return NextResponse.json(
      {
        success: true,
        data: {
          url: fileUrl,
          filename,
          bucketName,
          originalSize: buffer.length,
          processedSize: processedBuffer.length,
          compressionRatio: ((processedBuffer.length / buffer.length) * 100).toFixed(2) + '%',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ success: false, message: 'Failed to upload image' }, { status: 500 })
  }
}
