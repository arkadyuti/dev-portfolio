import { NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/api-middleware'
import { getCurrentUser } from '@/lib/auth/helpers'
import { uploadFile, makeFilePublic, getPublicFileUrl, deleteFile } from '@/lib/minio'
import ResumeModel, { transformToResume } from '@/models/resume'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'

const BUCKET_NAME = process.env.MINIO_IMAGE_BUCKET || 'portfolio'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function getHandler() {
  try {
    const resume = await ResumeModel.findOne({}).lean()

    if (!resume) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: transformToResume(resume as Record<string, unknown>),
    })
  } catch (error) {
    logger.error('Failed to fetch resume:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch resume', code: 'FETCH_ERROR' } },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: { message: 'No file provided', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: { message: 'Only PDF files are allowed', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { message: 'File size must be under 10MB', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to MinIO
    const fileKey = `resume/resume_${Date.now()}.pdf`
    await uploadFile(BUCKET_NAME, fileKey, buffer, {
      'Content-Type': 'application/pdf',
      'Original-Name': file.name,
      'Upload-Date': new Date().toISOString(),
    })

    // Make file public
    await makeFilePublic(BUCKET_NAME, fileKey)
    const fileUrl = getPublicFileUrl(BUCKET_NAME, fileKey)

    // Find existing resume for cleanup
    const existingResume = await ResumeModel.findOne({})
    const oldFileKey = existingResume?.fileKey

    if (existingResume) {
      // Update existing
      existingResume.fileName = file.name
      existingResume.fileKey = fileKey
      existingResume.fileUrl = fileUrl
      existingResume.fileSize = file.size
      existingResume.uploadedAt = Date.now()
      existingResume.mimeType = file.type
      await existingResume.save()
    } else {
      // Create new
      const newResume = new ResumeModel({
        id: uuidv4(),
        fileName: file.name,
        fileKey: fileKey,
        fileUrl: fileUrl,
        fileSize: file.size,
        uploadedAt: Date.now(),
        mimeType: file.type,
      })
      await newResume.save()
    }

    // Clean up old file
    if (oldFileKey && oldFileKey !== fileKey) {
      try {
        await deleteFile(BUCKET_NAME, oldFileKey)
        logger.info(`Deleted old resume file: ${oldFileKey}`)
      } catch (err) {
        logger.warn(`Failed to delete old resume file ${oldFileKey}:`, err)
      }
    }

    const savedResume = await ResumeModel.findOne({}).lean()

    return NextResponse.json({
      success: true,
      data: transformToResume(savedResume as Record<string, unknown>),
    })
  } catch (error) {
    logger.error('Failed to upload resume:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Failed to upload resume', code: 'UPLOAD_ERROR' } },
      { status: 500 }
    )
  }
}

export const GET = withDatabase(getHandler)
export const POST = withDatabase(postHandler)
