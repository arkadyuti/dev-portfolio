import { NextRequest, NextResponse } from 'next/server'
import ProjectModels, { transformToProjects } from 'models/project'
import { logger } from '@/lib/logger'
import { withDatabase } from '@/lib/api-middleware'

async function handler(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fetchAll = searchParams.get('fetchAll') === 'true'

    logger.info('Projects API called with params:', { fetchAll })

    // Build query
    const query: { isDraft?: boolean } = {}

    // If not fetching all, exclude drafts
    if (!fetchAll) {
      query.isDraft = false
    }

    logger.info('Query being used:', query)

    // Get projects from database
    const projects = await ProjectModels.find(query).sort({ featured: -1, createdAt: -1 }).lean()

    logger.info('Raw projects from database:', { count: projects.length, projects })

    const transformedProjects = transformToProjects(projects)
    logger.info('Transformed projects:', { count: transformedProjects.length, transformedProjects })

    return NextResponse.json({
      success: true,
      data: transformedProjects,
    })
  } catch (error) {
    logger.error('Error fetching projects', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// Export the handler wrapped with database middleware
export const GET = withDatabase(handler)
