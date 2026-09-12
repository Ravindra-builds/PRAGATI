import { NextRequest, NextResponse } from 'next/server'
import { dataLabService } from '@/lib/data-lab/service'
import {
  CanonicalProjectRecord,
  DataLabPredictionResult,
  ImportProvenance,
} from '@/lib/data-lab/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const records = body.records as CanonicalProjectRecord[]
    const predictions = body.predictions as DataLabPredictionResult[]
    const provenance = body.provenance as ImportProvenance

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'No valid records provided for persistence.' },
        { status: 400 }
      )
    }

    const defaultProvenance: ImportProvenance = provenance || {
      sourceType: 'CSV',
      sourceFilename: 'imported_data.csv',
      sourceHash: 'user_uploaded',
      importedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      parserVersion: '1.0.0',
      modelVersion: 'v1.0-dual-target',
    }

    const result = await dataLabService.saveImportedDataset(
      records,
      predictions || [],
      defaultProvenance
    )

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${result.savedProjectsCount} projects and ${result.savedPredictionsCount} predictions to PRAGATI database.`,
      ...result,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An error occurred while saving the imported dataset.',
      },
      { status: 500 }
    )
  }
}
