import { NextRequest, NextResponse } from 'next/server'
import BlogModels from 'models/blog'
import logger from '@/lib/logger'
import { withDatabase } from '@/lib/api-middleware'

async function postHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Get client IP for basic duplicate protection
    const clientIP =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Check if blog exists first
    const existingBlog = await BlogModels.findOne({ id }, { views: 1 }).lean()
    if (!existingBlog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Find and increment the view count for the blog post
    const updatedBlog = await BlogModels.findOneAndUpdate(
      { id },
      { $inc: { views: 1 } },
      { new: true, upsert: false }
    )

    if (!updatedBlog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    logger.info(
      `View count incremented for blog: ${id}, new count: ${updatedBlog.views}, IP: ${clientIP}`
    )

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBlog.id,
        views: updatedBlog.views,
      },
    })
  } catch (error) {
    logger.error('Error incrementing view count:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to increment view count' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current view count
async function getHandler(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const blog = await BlogModels.findOne({ id }, { views: 1, id: 1 }).lean()

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: blog.id,
        views: blog.views || 0,
      },
    })
  } catch (error) {
    logger.error('Error fetching view count:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch view count' },
      { status: 500 }
    )
  }
}

// Export handlers wrapped with database middleware
export const POST = withDatabase(postHandler)
export const GET = withDatabase(getHandler)
