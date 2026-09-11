/**
 * API Route: GET /api/projects/:projectId/updates
 * Retrieves historical monitoring snapshots for a project ordered chronologically.
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

    const updates = await projectService.getProjectUpdates(projectId)

    if (updates === null) {
      return NextResponse.json(
        { error: 'Not Found', message: `Project '${projectId}' does not exist` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      projectId,
      totalUpdates: updates.length,
      updates,
    })
  } catch (error) {
    console.error('Failed to get project updates:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to retrieve project updates' },
      { status: 500 }
    )
  }
}
