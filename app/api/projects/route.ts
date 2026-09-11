/**
 * API Route: GET /api/projects
 * Lists infrastructure projects with optional filtering by sector, ministry, state, status, risk, and pagination.
 */

import { NextRequest, NextResponse } from 'next/server'
import { projectService } from '@/lib/services/project-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filters = {
      sector: searchParams.get('sector') || undefined,
      ministry: searchParams.get('ministry') || undefined,
      state: searchParams.get('state') || undefined,
      status: searchParams.get('status') || undefined,
      risk: searchParams.get('risk') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    }

    const result = await projectService.getProjects(filters)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list projects:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to retrieve project list' },
      { status: 500 }
    )
  }
}
