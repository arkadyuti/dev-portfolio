import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { minioClient, uploadFile, makeFilePublic, getPublicFileUrl, deleteFile } from '@/lib/minio'
import ProjectModels from 'models/project'

export async function POST(request: NextRequest) {
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

    let coverImageKey = ''
    let coverImageUrl = ''
    let tempCoverImageKey = ''

    const targetProjectId = projectId ? projectId : uuidv4()
    const bucketName = process.env.MINIO_IMAGE_BUCKET

    // For existing project, fetch the current data to handle old image cleanup
    let existingProject = null
    let oldCoverImageKey = ''

    if (projectId) {
      existingProject = await ProjectModels.findOne({ slug: projectId })
      if (!existingProject) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
      }
      oldCoverImageKey = existingProject.coverImageKey || ''
    }

    // Handle cover image upload if provided
    if (coverImage) {
      // Convert file to buffer
      const bytes = await coverImage.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Create a temporary filename with UUID
      const fileExtension = coverImage.name.split('.').pop()
      const tempFilename = `temp_${uuidv4()}_cover-image.${fileExtension}`

      // Upload to MinIO with metadata
      await uploadFile(bucketName, tempFilename, buffer, {
        'Content-Type': coverImage.type || 'application/octet-stream',
        'Original-Name': coverImage.name,
        'Upload-Date': new Date().toISOString(),
      })

      tempCoverImageKey = tempFilename
      coverImageKey = tempFilename // Initially use temp filename
      coverImageUrl = getPublicFileUrl(bucketName, tempFilename)
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
      ...(coverImageUrl && { coverImage: coverImageUrl }),
      ...(coverImageKey && { coverImageKey }),
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

    // If we have a temporary cover image and the project was created/updated successfully,
    // upload it to the final location
    if (tempCoverImageKey && savedProject) {
      const fileExtension = tempCoverImageKey.split('.').pop()
      // Add timestamp salt to prevent caching
      const timestamp = Date.now()
      const finalFilename = `${savedProject.slug}_${timestamp}_cover-image.${fileExtension}`

      try {
        // Get the temporary file
        const tempFile = await minioClient.getObject(bucketName, tempCoverImageKey)
        const chunks: Buffer[] = []
        for await (const chunk of tempFile) {
          chunks.push(chunk)
        }
        const fileBuffer = Buffer.concat(chunks)

        // Upload the file to the final location
        await uploadFile(bucketName, finalFilename, fileBuffer, {
          'Content-Type': coverImage?.type || 'application/octet-stream',
          'Original-Name': coverImage?.name || finalFilename,
          'Upload-Date': new Date().toISOString(),
        })

        // Make the new file public
        await makeFilePublic(bucketName, finalFilename)

        // Delete the temporary file
        await deleteFile(bucketName, tempCoverImageKey)

        // Delete the old cover image if it exists and is different from the new one
        if (oldCoverImageKey && oldCoverImageKey !== finalFilename) {
          try {
            await deleteFile(bucketName, oldCoverImageKey)
          } catch (error) {
            console.warn(`Failed to delete old cover image: ${oldCoverImageKey}`, error)
            // Continue execution even if delete fails
          }
        }

        // Update the project with the new file information and save to DB
        savedProject.coverImageKey = finalFilename
        savedProject.coverImage = getPublicFileUrl(bucketName, finalFilename)
        await savedProject.save()
      } catch (error) {
        console.error('Error processing cover image:', error)
        // If processing fails, we'll keep using the temporary file
        // The project will still work, just with a less ideal filename
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: savedProject,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing project post:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process project post' },
      { status: 500 }
    )
  }
}
