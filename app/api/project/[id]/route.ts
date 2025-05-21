import { NextRequest, NextResponse } from 'next/server'
import ProjectModels, { transformToProject } from 'models/project'
import { deleteFile } from '@/lib/minio'

// GET a single project by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await ProjectModels.findOne({ id }).lean()

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: transformToProject(project),
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// DELETE a project by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await ProjectModels.findOne({ id })

    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Delete cover image if exists
    if (project.coverImageKey) {
      try {
        await deleteFile(process.env.MINIO_IMAGE_BUCKET!, project.coverImageKey)
      } catch (error) {
        console.warn(`Failed to delete cover image: ${project.coverImageKey}`, error)
        // Continue execution even if delete fails
      }
    }

    // Delete project from database
    await ProjectModels.deleteOne({ id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
