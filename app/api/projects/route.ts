import { NextRequest, NextResponse } from 'next/server'
import ProjectModels, { transformToProjects } from 'models/project'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fetchAll = searchParams.get('fetchAll') === 'true'

    // Build query
    const query: { isDraft?: boolean } = {}

    // If not fetching all, exclude drafts
    if (!fetchAll) {
      query.isDraft = false
    }

    // Get projects from database
    const projects = await ProjectModels.find(query).sort({ featured: -1, createdAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      data: transformToProjects(projects),
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
