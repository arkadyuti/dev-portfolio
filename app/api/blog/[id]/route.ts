import { NextRequest, NextResponse } from 'next/server'
import BlogModels, { transformToBlog } from 'models/blog'
import { ZodError } from 'zod'
import { deleteFile } from '@/lib/minio'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Find the blog post by id
    const existingBlog = await BlogModels.findOne({ id })

    const transformedBlog = transformToBlog(existingBlog)

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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Find the blog post before deleting to get the cover image key
    const blog = await BlogModels.findOne({ id })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Delete cover image if exists
    if (blog.coverImageKey) {
      try {
        await deleteFile(process.env.MINIO_IMAGE_BUCKET!, blog.coverImageKey)
      } catch (error) {
        console.warn(`Failed to delete cover image: ${blog.coverImageKey}`, error)
        // Continue execution even if delete fails
      }
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
