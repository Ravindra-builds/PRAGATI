import { NextRequest, NextResponse } from 'next/server'
import { dataLabService } from '@/lib/data-lab/service'
import { CanonicalFieldKey } from '@/lib/data-lab/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const overridesJson = formData.get('mappingOverrides') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in request.' },
        { status: 400 }
      )
    }

    let customOverrides: Record<string, CanonicalFieldKey> | undefined
    if (overridesJson) {
      try {
        customOverrides = JSON.parse(overridesJson)
      } catch {
        // Ignore invalid override JSON
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name || 'uploaded_document.csv'

    const result = await dataLabService.processUpload(buffer, filename, customOverrides)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An error occurred while processing the uploaded file.',
      },
      { status: 500 }
    )
  }
}
