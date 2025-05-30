import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/mongodb'
import BlogModels, { transformToBlogs } from '@/models/blog'
import ProjectModels, { transformToProjects } from '@/models/project'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('q') || ''

    if (!query) {
      return NextResponse.json({
        success: true,
        data: { blogs: [], projects: [] },
      })
    }

    await connectToDatabase()

    // Create a case-insensitive search regex
    const searchRegex = { $regex: query, $options: 'i' }

    // Search for blogs
    const blogs = await BlogModels.find({
      isDraft: false,
      $or: [
        { title: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex },
        { 'tags.name': searchRegex },
      ],
    }).lean()

    // Search for projects
    const projects = await ProjectModels.find({
      isDraft: false,
      $or: [{ title: searchRegex }, { description: searchRegex }, { 'tags.name': searchRegex }],
    }).lean()

    return NextResponse.json({
      success: true,
      data: {
        blogs: transformToBlogs(blogs),
        projects: transformToProjects(projects),
      },
    })
  } catch (error) {
    logger.error('Search error', error)
    return NextResponse.json({ success: false, message: 'Failed to search' }, { status: 500 })
  }
}
