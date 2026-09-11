/**
 * API Route: GET /api/projects/:projectId
 * Retrieves single project details, historical snapshots, latest predictions, and active warnings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params

    if (!projectId || projectId.trim() === '') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Project ID is required' },
        { status: 400 }
      )
    }

    const project = await projectService.getProjectById(projectId)

    if (!project) {
      return NextResponse.json(
        { error: 'Not Found', message: `Project '${projectId}' does not exist` },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to get project detail:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to retrieve project details' },
      { status: 500 }
    )
  }
}
