import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector') || undefined
    const ministry = searchParams.get('ministry') || undefined
    const state = searchParams.get('state') || undefined

    const summary = await projectService.getDashboardSummary({
      sector,
      ministry,
      state,
    })

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUMMARY_FETCH_FAILED',
          message: 'Failed to retrieve portfolio summary.',
          details: err.message,
        },
      },
      { status: 500 }
    )
  }
}
