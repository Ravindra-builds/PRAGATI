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
        { success: false, error: 'No file provided in request.' },
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

    let buffer: Buffer
    let filename = 'uploaded_document.csv'

    if (typeof file === 'string') {
      buffer = Buffer.from(file, 'utf-8')
    } else if (file && typeof (file as unknown as Blob).arrayBuffer === 'function') {
      buffer = Buffer.from(await (file as unknown as Blob).arrayBuffer())
      filename = (file as File).name || filename
    } else {
      return NextResponse.json(
        { success: false, error: 'Received invalid file payload format.' },
        { status: 400 }
      )
    }

    const result = await dataLabService.processUpload(buffer, filename, customOverrides)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred while processing the uploaded file.'
    console.error('[/api/data-lab/parse error]:', err)
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
