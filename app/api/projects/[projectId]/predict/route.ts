/**
 * API Route: POST /api/projects/:projectId/predict
 * Controlled server-side prediction flow.
 *
 * Steps:
 * 1. Fetches the latest monitoring update for the project
 * 2. Prepares observation-time payload
 * 3. Calls FastAPI ML inference service
 * 4. Persists the prediction in PostgreSQL
 * 5. Evaluates and creates early warning records
 * 6. Returns prediction and warnings summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictionService } from '@/lib/services/prediction-service'
import {
  MLServiceError,
  MLServiceUnavailableError,
  MLResponseValidationError,
} from '@/lib/ml-client'

export async function POST(
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

    const result = await predictionService.generatePrediction(projectId)

    return NextResponse.json({
      success: true,
      projectId,
      prediction: result.prediction,
      warningsGenerated: result.warnings.length,
      warnings: result.warnings,
      drivers: result.drivers,
    })
  } catch (error) {
    if (error instanceof MLServiceUnavailableError) {
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message: 'The ML prediction service is currently offline or unreachable',
          details: error.message,
        },
        { status: 503 }
      )
    }

    if (error instanceof MLResponseValidationError) {
      return NextResponse.json(
        {
          error: 'Bad Gateway',
          message: 'The ML service returned a response that violated expected bounds',
          details: error.details,
        },
        { status: 502 }
      )
    }

    if (error instanceof MLServiceError) {
      return NextResponse.json(
        {
          error: 'ML Service Error',
          message: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      )
    }

    const errMsg = (error as Error).message || ''
    if (errMsg.includes('not found')) {
      return NextResponse.json(
        { error: 'Not Found', message: errMsg },
        { status: 404 }
      )
    }
    if (errMsg.includes('no monitoring snapshots')) {
      return NextResponse.json(
        { error: 'Unprocessable Entity', message: errMsg },
        { status: 422 }
      )
    }

    console.error('Prediction flow failed:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: errMsg || 'Prediction flow failed' },
      { status: 500 }
    )
  }
}
