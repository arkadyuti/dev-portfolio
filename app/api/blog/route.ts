import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { minioClient, uploadFile, makeFilePublic, getPublicFileUrl, deleteFile } from '@/lib/minio'
import { queueFileDeletion } from '@/lib/background-tasks'
import BlogModels from 'models/blog'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const coverImage = formData.get('coverImage') as File
    const blogId = request.nextUrl.searchParams.get('blogId')

    // Get other form data
    const title = formData.get('title')
    const author = formData.get('author')
    const excerpt = formData.get('excerpt')
    const content = formData.get('content')
    const contentRTE = formData.get('contentRTE') as string
    const contentImages = JSON.parse(formData.get('contentImages') as string)
    const featured = formData.get('featured') === 'true'
    const tags = JSON.parse(formData.get('tags') as string)
    const isDraft = formData.get('isDraft') === 'true'

    let coverImageKey = ''
    let coverImageUrl = ''
    let tempCoverImageKey = ''

    const targetBlogId = blogId ? blogId : uuidv4()
    const bucketName = process.env.MINIO_IMAGE_BUCKET

    // For existing blog, fetch the current data to handle old image cleanup
    let existingBlog = null
    let oldCoverImageKey = ''

    if (blogId) {
      existingBlog = await BlogModels.findOne({ id: blogId })
      if (!existingBlog) {
        return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
      }
      oldCoverImageKey = existingBlog.coverImageKey || ''
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
      id: targetBlogId,
      publishedAt: Date.now(),
      title,
      author,
      excerpt,
      content,
      contentRTE: JSON.parse(contentRTE),
      contentImages,
      featured,
      tags,
      isDraft,
      ...(coverImageUrl && { coverImage: coverImageUrl }),
      ...(coverImageKey && { coverImageKey }),
    }

    let savedArticle
    if (existingBlog) {
      // Update existing blog
      Object.assign(existingBlog, dataToSave)
      savedArticle = await existingBlog.save()
    } else {
      // Create new blog
      const newArticle = new BlogModels(dataToSave)
      savedArticle = await newArticle.save()
    }

    // If we have a temporary cover image and the blog was created/updated successfully,
    // upload it to the final location
    if (tempCoverImageKey && savedArticle) {
      const fileExtension = tempCoverImageKey.split('.').pop()
      // Add timestamp salt to prevent caching
      const timestamp = Date.now()
      const finalFilename = `${savedArticle.id}_${timestamp}_cover-image.${fileExtension}`

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

        // Queue deletion of the old cover image if it exists and is different from the new one
        if (oldCoverImageKey && oldCoverImageKey !== finalFilename) {
          queueFileDeletion(bucketName, oldCoverImageKey)
        }

        // Update the blog with the new file information and save to DB
        savedArticle.coverImageKey = finalFilename
        savedArticle.coverImage = getPublicFileUrl(bucketName, finalFilename)
        await savedArticle.save()
      } catch (error) {
        logger.error('Error processing cover image:', error)
        // If processing fails, we'll keep using the temporary file
        // The blog will still work, just with a less ideal filename
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: savedArticle,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error processing blog post:', error.message)
    return NextResponse.json(
      { success: false, message: 'Failed to process blog post' },
      { status: 500 }
    )
  }
}
