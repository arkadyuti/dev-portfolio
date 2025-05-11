import { NextRequest, NextResponse } from 'next/server'
import BlogModels, { transformToBlog } from 'models/blog'
import { ZodError } from 'zod'

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: id } = await context.params
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
