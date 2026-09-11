/**
 * API Route: GET /api/analytics/compare
 * Compares two projects side-by-side across execution progress, schedule, and model risk metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectA = searchParams.get('projectA')
    const projectB = searchParams.get('projectB')

    if (!projectA || !projectB) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Both projectA and projectB query parameters are required for comparison.',
          },
        },
        { status: 400 }
      )
    }

    const data = await projectService.compareProjects(projectA, projectB)
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to compare projects:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'COMPARISON_FAILED',
          message: 'Failed to compare selected projects',
          details,
        },
      },
      { status: 500 }
    )
  }
}
