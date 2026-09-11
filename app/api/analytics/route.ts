/**
 * API Route: GET /api/analytics
 * Retrieves portfolio analytics aggregates including risk distribution, sector/ministry breakdowns,
 * scatter points for progress analysis, and temporal trends.
 */

import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = {
      ministry: searchParams.get('ministry') || undefined,
      sector: searchParams.get('sector') || undefined,
      state: searchParams.get('state') || undefined,
      risk: searchParams.get('risk') || undefined,
    }

    const data = await projectService.getAnalyticsData(filters)
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to retrieve analytics data:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to retrieve portfolio analytics data',
          details,
        },
      },
      { status: 500 }
    )
  }
}
