/**
 * API Route: GET /api/alerts
 * Lists early warning alerts with filtering by severity, warningType, sector, projectId, and text search.
 */

import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = {
      severity: searchParams.get('severity') || undefined,
      warningType: searchParams.get('warningType') || undefined,
      sector: searchParams.get('sector') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    }

    const result = await projectService.getAlerts(filters)
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to list alerts:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ALERTS_FETCH_FAILED',
          message: 'Failed to retrieve alerts list',
          details,
        },
      },
      { status: 500 }
    )
  }
}
