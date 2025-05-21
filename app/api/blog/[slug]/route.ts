import { NextRequest, NextResponse } from 'next/server'
import BlogModels, { transformToBlog } from 'models/blog'
import { ZodError } from 'zod'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: identifier } = await context.params

    // Try to find the blog post by id or slug
    const existingBlog = await BlogModels.findOne({
      $or: [{ id: identifier }, { slug: identifier }],
    })

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

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: identifier } = await context.params

    // Try to find and delete the blog post by id or slug
    const deletedBlog = await BlogModels.findOneAndDelete({
      $or: [{ id: identifier }, { slug: identifier }],
    })

    if (!deletedBlog) {
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
