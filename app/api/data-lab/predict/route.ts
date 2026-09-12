import { NextRequest, NextResponse } from 'next/server'
import { dataLabService } from '@/lib/data-lab/service'
import { CanonicalProjectRecord } from '@/lib/data-lab/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const records = body.records as CanonicalProjectRecord[]

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty records array provided for prediction.' },
        { status: 400 }
      )
    }

    const predictions = await dataLabService.predictBatch(records)

    return NextResponse.json({
      success: true,
      predictionsCount: predictions.length,
      predictions,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An error occurred while executing ML predictions.',
      },
      { status: 500 }
    )
  }
}
