import { NextRequest, NextResponse } from 'next/server'
import BlogModels, { transformToBlog } from 'models/blog'
import { ZodError } from 'zod'
import { queueFileDeletion, queueFileDeletions } from '@/lib/background-tasks'
import { withDatabase } from '@/lib/api-middleware'

async function getHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Find the blog post by id
    const existingBlog = await BlogModels.findOne({ id })

    const transformedBlog = transformToBlog(
      existingBlog.toObject({
        minimize: false, // This prevents removal of empty objects
        transform: false, // This prevents any transformation functions
      })
    )

    if (!transformedBlog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transformedBlog }, { status: 200 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data validation failed',
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to process blog post' },
      { status: 500 }
    )
  }
}

async function deleteHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Find the blog post before deleting to get the cover image key
    const blog = await BlogModels.findOne({ id })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Queue cover image deletion if exists
    if (blog.coverImageKey) {
      queueFileDeletion(process.env.MINIO_IMAGE_BUCKET!, blog.coverImageKey)
    }

    // Queue content images deletion if they exist
    if (blog.contentImages && blog.contentImages.length > 0) {
      queueFileDeletions(process.env.MINIO_IMAGE_BUCKET!, blog.contentImages)
    }

    // Delete the blog post by id
    const deletedBlog = await BlogModels.deleteOne({ id })

    if (deletedBlog.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, message: 'Blog post deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete blog post' },
      { status: 500 }
    )
  }
}

// Export handlers wrapped with database middleware
export const GET = withDatabase(getHandler)
export const DELETE = withDatabase(deleteHandler)
