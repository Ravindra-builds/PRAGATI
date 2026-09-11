/**
 * API Route: GET /api/projects/:projectId/predictions
 * Retrieves historical predictions and linked warnings for a project.
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

    const predictions = await projectService.getProjectPredictions(projectId)

    if (predictions === null) {
      return NextResponse.json(
        { error: 'Not Found', message: `Project '${projectId}' does not exist` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      projectId,
      totalPredictions: predictions.length,
      predictions,
    })
  } catch (error) {
    console.error('Failed to get project predictions:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to retrieve project predictions' },
      { status: 500 }
    )
  }
}
