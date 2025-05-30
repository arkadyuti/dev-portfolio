import { NextRequest, NextResponse } from 'next/server'
import BlogModels from 'models/blog'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Get all unique tags from blogs
    const blogs = await BlogModels.find({ isDraft: false }).select('tags').lean()

    // Create a Set to store unique tags
    const uniqueTags = new Set<string>()
    const tagsMap = new Map<string, string>() // Map to store id -> name mapping

    // Extract unique tags
    blogs.forEach((blog) => {
      blog.tags.forEach((tag: { id?: string; name: string }) => {
        if (tag.name) {
          uniqueTags.add(tag.name)
          if (tag.id) {
            tagsMap.set(tag.name, tag.id)
          }
        }
      })
    })

    // Convert to array of Tag objects
    const tags = Array.from(uniqueTags).map((name, index) => ({
      id: tagsMap.get(name) || `tag-${index + 1}`,
      name,
    }))

    return NextResponse.json(
      {
        success: true,
        data: tags,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error fetching tags', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch tags' }, { status: 500 })
  }
}
