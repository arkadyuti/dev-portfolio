import { NextRequest, NextResponse } from 'next/server'
import BlogModels, { transformToBlogs } from 'models/blog'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const fetchAll = searchParams.get('fetchAll')
    const skip = (page - 1) * limit

    // Get total count of blogs
    const totalBlogs = await BlogModels.countDocuments()

    // Get paginated blogs sorted by publishedAt
    const mongoQuery: { isDraft?: boolean } = {}
    if (fetchAll === '') {
      mongoQuery.isDraft = false
    }
    const blogs = await BlogModels.find(mongoQuery)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    if (!blogs || blogs.length === 0) {
      return NextResponse.json({ success: false, message: 'No blogs found' }, { status: 404 })
    }

    // Transform the blogs using our utility function
    const transformedBlogs = transformToBlogs(blogs)

    return NextResponse.json(
      {
        success: true,
        data: transformedBlogs,
        pagination: {
          total: totalBlogs,
          page,
          limit,
          totalPages: Math.ceil(totalBlogs / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching blogs:', error)
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
