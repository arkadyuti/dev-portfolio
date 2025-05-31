import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import BlogModels from 'models/blog'
import logger from '@/lib/logger'
import { uploadTempImage, moveToFinalLocation } from '@/lib/image-upload'

export async function POST(request: NextRequest) {
  try {
    logger.info('Starting blog post processing')
    const formData = await request.formData()
    const coverImage = formData.get('coverImage') as File
    const blogId = request.nextUrl.searchParams.get('blogId')
    logger.info('Form data received', { blogId, hasCoverImage: !!coverImage })

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
    logger.info('Form data parsed', { title, author, featured, isDraft })

    const targetBlogId = blogId ? blogId : uuidv4()
    const bucketName = process.env.MINIO_IMAGE_BUCKET
    const tempImagesPath = 'temp-images'
    const blogImagesPath = 'blog-images'
    logger.info('Configuration set', { targetBlogId, bucketName })

    // For existing blog, fetch the current data to handle old image cleanup
    let existingBlog = null
    let oldCoverImageKey = ''

    if (blogId) {
      logger.info('Fetching existing blog', { blogId })
      existingBlog = await BlogModels.findOne({ id: blogId })
      if (!existingBlog) {
        logger.warn('Blog not found', { blogId })
        return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
      }
      oldCoverImageKey = existingBlog.coverImageKey || ''
      logger.info('Existing blog found', { oldCoverImageKey })
    }

    // Upload temporary image if provided
    let tempImageResult = null
    if (coverImage) {
      logger.info('Starting temporary image upload')
      try {
        tempImageResult = await uploadTempImage({
          bucketName,
          file: coverImage,
          tempImagesPath,
        })
        logger.info('Temporary image upload successful', {
          tempFilename: tempImageResult.tempFilename,
        })
      } catch (error) {
        logger.error('Temporary image upload failed', { error: JSON.stringify(error) })
        throw error
      }
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
      ...(tempImageResult && {
        coverImage: tempImageResult.coverImage,
        coverImageKey: tempImageResult.coverImageKey,
      }),
    }
    logger.info('Preparing to save blog data', { targetBlogId })

    let savedArticle
    try {
      if (existingBlog) {
        // Update existing blog
        logger.info('Updating existing blog')
        Object.assign(existingBlog, dataToSave)
        savedArticle = await existingBlog.save()
      } else {
        // Create new blog
        logger.info('Creating new blog')
        const newArticle = new BlogModels(dataToSave)
        savedArticle = await newArticle.save()
      }
      logger.info('Blog saved successfully', { blogId: savedArticle.id })
    } catch (error) {
      logger.error('Failed to save blog', { error: JSON.stringify(error) })
      throw error
    }

    // If we have a temporary image and the blog was saved successfully,
    // move it to the final location
    if (tempImageResult && savedArticle) {
      logger.info('Starting final image move', {
        tempFilename: tempImageResult.tempFilename,
        blogId: savedArticle.id,
      })
      try {
        const finalImageResult = await moveToFinalLocation({
          bucketName,
          tempFilename: tempImageResult.tempFilename,
          finalImagesPath: blogImagesPath,
          entityId: savedArticle.id,
          oldImageKey: oldCoverImageKey,
          file: coverImage,
        })

        // Update the blog with the final file information
        savedArticle.coverImageKey = finalImageResult.coverImageKey
        savedArticle.coverImage = finalImageResult.coverImage
        await savedArticle.save()
        logger.info('Final image move successful', {
          finalFilename: finalImageResult.coverImageKey,
        })
      } catch (error) {
        logger.error('Final image move failed', { error: JSON.stringify(error) })
        throw error
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
    logger.error('Error processing blog post:', {
      error: JSON.stringify(error),
      stack: error.stack,
      message: error.message,
    })
    return NextResponse.json(
      { success: false, message: 'Failed to process blog post' },
      { status: 500 }
    )
  }
}
