import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import ProjectModels from 'models/project'
import { logger } from '@/lib/logger'
import { uploadTempImage, moveToFinalLocation } from '@/lib/image-upload'
import { withDatabase } from '@/lib/api-middleware'

async function handler(request: NextRequest) {
  try {
    const formData = await request.formData()
    const coverImage = formData.get('coverImage') as File
    const projectId = request.nextUrl.searchParams.get('projectId')

    // Get other form data
    const title = formData.get('title')
    const description = formData.get('description')
    const featured = formData.get('featured') === 'true'
    const tags = JSON.parse(formData.get('tags') as string)
    const isDraft = formData.get('isDraft') === 'true'
    const githubUrl = formData.get('githubUrl') || ''
    const liveUrl = formData.get('liveUrl') || ''
    const status = formData.get('status') || 'completed'

    const targetProjectId = projectId ? projectId : uuidv4()
    const bucketName = process.env.MINIO_IMAGE_BUCKET
    const tempImagesPath = 'temp-images'
    const projectImagesPath = 'project-images'

    // For existing project, fetch the current data to handle old image cleanup
    let existingProject = null
    let oldCoverImageKey = ''

    if (projectId) {
      existingProject = await ProjectModels.findOne({ id: projectId })
      if (!existingProject) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
      }
      oldCoverImageKey = existingProject.coverImageKey || ''
    }

    // Upload temporary image if provided
    let tempImageResult = null
    if (coverImage) {
      tempImageResult = await uploadTempImage({
        bucketName,
        file: coverImage,
        tempImagesPath,
      })
    }

    const dataToSave = {
      id: targetProjectId,
      title,
      description,
      featured,
      tags,
      isDraft,
      githubUrl,
      liveUrl,
      status,
      ...(tempImageResult && {
        coverImage: tempImageResult.coverImage,
        coverImageKey: tempImageResult.coverImageKey,
      }),
    }

    let savedProject
    if (existingProject) {
      // Update existing project
      Object.assign(existingProject, dataToSave)
      savedProject = await existingProject.save()
    } else {
      // Create new project
      const newProject = new ProjectModels(dataToSave)
      savedProject = await newProject.save()
    }

    // If we have a temporary image and the project was saved successfully,
    // move it to the final location
    if (tempImageResult && savedProject) {
      const finalImageResult = await moveToFinalLocation({
        bucketName,
        tempFilename: tempImageResult.tempFilename,
        finalImagesPath: projectImagesPath,
        entityId: savedProject.id,
        oldImageKey: oldCoverImageKey,
        file: coverImage,
      })

      // Update the project with the final file information
      savedProject.coverImageKey = finalImageResult.coverImageKey
      savedProject.coverImage = finalImageResult.coverImage
      await savedProject.save()
    }

    return NextResponse.json(
      {
        success: true,
        data: savedProject,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error processing project post', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process project post' },
      { status: 500 }
    )
  }
}

export const POST = withDatabase(handler)
