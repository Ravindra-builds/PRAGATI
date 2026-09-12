/**
 * PRAGATI Data Lab - Multi-Format Data Extractor.
 *
 * Provides safe, isolated extraction for PDF, CSV, XLSX, JSON, TXT, and MD files.
 * Enforces size limits, path sanitization, and structural normalization.
 */

import crypto from 'crypto'
import * as XLSX from 'xlsx'
import { PDFParse } from 'pdf-parse'
import {
  SupportedFormat,
  ExtractionResult,
  RawExtractedRecord,
} from './types'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB limit

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export function detectFormatFromFilename(filename: string): SupportedFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'PDF'
    case 'csv':
      return 'CSV'
    case 'xlsx':
    case 'xls':
      return 'XLSX'
    case 'json':
      return 'JSON'
    case 'txt':
      return 'TXT'
    case 'md':
    case 'markdown':
      return 'MD'
    default:
      return null
  }
}

/**
 * Standardizes raw string keys by trimming and removing BOM characters.
 */
function cleanKey(k: string): string {
  return k.replace(/^\uFEFF/, '').trim()
}

/**
 * Parses CSV buffer into structured rows using RFC-compliant line/quote parsing.
 */
export function extractFromCSV(buffer: Buffer, filename: string): ExtractionResult {
  const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  const parseWarnings: string[] = []

  if (lines.length === 0) {
    return {
      format: 'CSV',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: 0,
      projectsDetected: 0,
      extractedRecords: [],
      parseWarnings: ['File is empty or contains only whitespace.'],
    }
  }

  // Parse CSV lines taking into account quotes
  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0]).map(cleanKey)
  const extractedRecords: RawExtractedRecord[] = []
  const detectedProjectIds = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue

    const record: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      record[header] = values[idx] !== undefined ? values[idx] : ''
    })

    const projectIdVal = record['project_id'] || record['Project ID'] || record['Project Code'] || `PRJ-ROW-${i}`
    if (projectIdVal) {
      detectedProjectIds.add(String(projectIdVal).trim())
    }

    extractedRecords.push({
      recordIndex: i - 1,
      rawFields: record,
    })
  }

  return {
    format: 'CSV',
    filename,
    fileSizeBytes: buffer.length,
    fileHash: computeFileHash(buffer),
    recordsDetected: extractedRecords.length,
    projectsDetected: detectedProjectIds.size > 0 ? detectedProjectIds.size : extractedRecords.length,
    extractedRecords,
    parseWarnings,
  }
}

/**
 * Parses JSON buffer into structured records. Supports array of objects or single project object.
 */
export function extractFromJSON(buffer: Buffer, filename: string): ExtractionResult {
  const parseWarnings: string[] = []
  let data: unknown

  try {
    const jsonStr = buffer.toString('utf-8')
    data = JSON.parse(jsonStr)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return {
      format: 'JSON',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: 0,
      projectsDetected: 0,
      extractedRecords: [],
      parseWarnings: [`Malformed JSON syntax: ${errMsg}`],
    }
  }

  let items: unknown[] = []
  if (Array.isArray(data)) {
    items = data
  } else if (typeof data === 'object' && data !== null) {
    const dataObj = data as Record<string, unknown>
    // Check if wrapped in projects/data property
    if (Array.isArray(dataObj.projects)) {
      items = dataObj.projects
    } else if (Array.isArray(dataObj.data)) {
      items = dataObj.data
    } else if (Array.isArray(dataObj.records)) {
      items = dataObj.records
    } else {
      items = [data]
    }
  }

  const extractedRecords: RawExtractedRecord[] = []
  const detectedProjectIds = new Set<string>()

  items.forEach((item, index) => {
    if (typeof item === 'object' && item !== null) {
      const flattened: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          // Flatten nested 1-level
          for (const [subK, subV] of Object.entries(v)) {
            flattened[`${k}_${subK}`] = subV
          }
        } else {
          flattened[k] = v
        }
      }

      const pId = flattened['project_id'] || flattened['projectId'] || flattened['Project ID'] || `PRJ-${index + 1}`
      detectedProjectIds.add(String(pId).trim())

      extractedRecords.push({
        recordIndex: index,
        rawFields: flattened,
      })
    }
  })

  return {
    format: 'JSON',
    filename,
    fileSizeBytes: buffer.length,
    fileHash: computeFileHash(buffer),
    recordsDetected: extractedRecords.length,
    projectsDetected: detectedProjectIds.size,
    extractedRecords,
    parseWarnings,
  }
}

/**
 * Parses XLSX / XLS buffer using SheetJS.
 */
export function extractFromXLSX(buffer: Buffer, filename: string): ExtractionResult {
  const parseWarnings: string[] = []
  let workbook: XLSX.WorkBook

  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return {
      format: 'XLSX',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: 0,
      projectsDetected: 0,
      extractedRecords: [],
      parseWarnings: [`Failed to parse Excel workbook: ${errMsg}`],
    }
  }

  if (workbook.SheetNames.length === 0) {
    return {
      format: 'XLSX',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: 0,
      projectsDetected: 0,
      extractedRecords: [],
      parseWarnings: ['Workbook contains no sheets.'],
    }
  }

  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

  const extractedRecords: RawExtractedRecord[] = []
  const detectedProjectIds = new Set<string>()

  rows.forEach((row, index) => {
    const cleanedRow: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      cleanedRow[cleanKey(k)] = v
    }

    const pId = cleanedRow['project_id'] || cleanedRow['Project ID'] || cleanedRow['Project Code'] || `PRJ-ROW-${index + 1}`
    detectedProjectIds.add(String(pId).trim())

    extractedRecords.push({
      recordIndex: index,
      rawFields: cleanedRow,
    })
  })

  return {
    format: 'XLSX',
    filename,
    fileSizeBytes: buffer.length,
    fileHash: computeFileHash(buffer),
    recordsDetected: extractedRecords.length,
    projectsDetected: detectedProjectIds.size,
    extractedRecords,
    documentMetadata: {
      sheets: workbook.SheetNames,
      activeSheet: firstSheetName,
    },
    parseWarnings,
  }
}

/**
 * Key-Value and Table Extractor for Text and Markdown reports.
 */
export function extractFromTextOrMarkdown(
  buffer: Buffer,
  filename: string,
  format: 'TXT' | 'MD'
): ExtractionResult {
  const text = buffer.toString('utf-8')
  const parseWarnings: string[] = []

  // Check if there is a Markdown table
  const lines = text.split('\n')
  const tableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'))

  if (tableLines.length >= 3) {
    // Markdown table detected
    const headerLine = tableLines[0]
    const headers = headerLine
      .split('|')
      .slice(1, -1)
      .map(h => cleanKey(h))

    const extractedRecords: RawExtractedRecord[] = []
    const detectedProjectIds = new Set<string>()

    // Skip separator line (index 1)
    for (let i = 2; i < tableLines.length; i++) {
      const cells = tableLines[i]
        .split('|')
        .slice(1, -1)
        .map(c => c.trim())

      if (cells.length === 0 || cells.every(c => c === '')) continue

      const record: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        record[h] = cells[idx] || ''
      })

      const pId = record['project_id'] || record['Project ID'] || `PRJ-ROW-${i - 1}`
      detectedProjectIds.add(String(pId).trim())

      extractedRecords.push({
        recordIndex: i - 2,
        rawFields: record,
      })
    }

    if (extractedRecords.length > 0) {
      return {
        format,
        filename,
        fileSizeBytes: buffer.length,
        fileHash: computeFileHash(buffer),
        recordsDetected: extractedRecords.length,
        projectsDetected: detectedProjectIds.size,
        extractedRecords,
        parseWarnings,
      }
    }
  }

  // Fallback: Key-Value Dossier Extraction (for single/multi project dossiers in Text/Markdown)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const allLines = normalizedText.split('\n')
  const records: Record<string, unknown>[] = []
  let currentRecord: Record<string, unknown> = {}

  for (const rawLine of allLines) {
    const trimmed = rawLine.trim()
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.includes(':') && !trimmed.includes('='))) {
      continue
    }

    const colonIdx = trimmed.indexOf(':')
    const eqIdx = trimmed.indexOf('=')
    let splitIdx = -1
    if (colonIdx !== -1 && eqIdx !== -1) {
      splitIdx = Math.min(colonIdx, eqIdx)
    } else if (colonIdx !== -1) {
      splitIdx = colonIdx
    } else if (eqIdx !== -1) {
      splitIdx = eqIdx
    }

    if (splitIdx > 0) {
      const rawKey = cleanKey(trimmed.slice(0, splitIdx).replace(/^[-*•#\d.]+\s*/, ''))
      const rawVal = trimmed.slice(splitIdx + 1).trim()

      if (rawKey.length > 0 && rawVal.length > 0) {
        // If we encounter a new Project ID or repeated Project ID key, roll over to next record
        if (
          (rawKey.toLowerCase().includes('project id') || rawKey.toLowerCase() === 'project_id' || rawKey.toLowerCase() === 'project code') &&
          Object.keys(currentRecord).length >= 2
        ) {
          records.push(currentRecord)
          currentRecord = {}
        }
        currentRecord[rawKey] = rawVal
      }
    }
  }

  if (Object.keys(currentRecord).length > 0) {
    records.push(currentRecord)
  }

  if (records.length === 0) {
    parseWarnings.push(
      'Could not detect standard tables or key-value pairs. Provided full raw text for preview.'
    )
    records.push({ raw_text_content: text.slice(0, 2000) })
  }

  const extractedRecords: RawExtractedRecord[] = records.map((rec, index) => ({
    recordIndex: index,
    rawFields: rec,
    extractedTextPreview: text.slice(0, 500),
  }))

  return {
    format,
    filename,
    fileSizeBytes: buffer.length,
    fileHash: computeFileHash(buffer),
    recordsDetected: extractedRecords.length,
    projectsDetected: extractedRecords.length,
    extractedRecords,
    parseWarnings,
  }
}

/**
 * Safe PDF Text & Key-Value / Tabular Extractor using PDFParse.
 */
export async function extractFromPDF(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const parseWarnings: string[] = []

  try {
    const parser = new PDFParse({ data: buffer })
    const textData = await parser.getText()
    const text = textData.text || ''
    const info = await parser.getInfo().catch(() => ({} as Record<string, unknown>))

    if (!text.trim()) {
      return {
        format: 'PDF',
        filename,
        fileSizeBytes: buffer.length,
        fileHash: computeFileHash(buffer),
        recordsDetected: 0,
        projectsDetected: 0,
        extractedRecords: [],
        parseWarnings: ['PDF contains no selectable text layer.'],
      }
    }

    // Attempt key-value & table extraction from extracted text
    const textBuffer = Buffer.from(text, 'utf-8')
    const textResult = extractFromTextOrMarkdown(textBuffer, filename, 'TXT')

    return {
      format: 'PDF',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: textResult.recordsDetected,
      projectsDetected: textResult.projectsDetected,
      extractedRecords: textResult.extractedRecords,
      documentMetadata: {
        numPages: textData.total || 1,
        info,
      },
      parseWarnings: [...parseWarnings, ...textResult.parseWarnings],
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return {
      format: 'PDF',
      filename,
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      recordsDetected: 0,
      projectsDetected: 0,
      extractedRecords: [],
      parseWarnings: [`Safe PDF extraction failed: ${errMsg}`],
    }
  }
}

/**
 * Unified dispatch function for all supported formats.
 */
export async function extractUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of 15 MB.`)
  }

  const format = detectFormatFromFilename(filename)
  if (!format) {
    throw new Error(
      `Unsupported file extension for "${filename}". Supported formats: PDF, CSV, XLSX, JSON, TXT, MD.`
    )
  }

  switch (format) {
    case 'CSV':
      return extractFromCSV(buffer, filename)
    case 'JSON':
      return extractFromJSON(buffer, filename)
    case 'XLSX':
      return extractFromXLSX(buffer, filename)
    case 'TXT':
      return extractFromTextOrMarkdown(buffer, filename, 'TXT')
    case 'MD':
      return extractFromTextOrMarkdown(buffer, filename, 'MD')
    case 'PDF':
      return extractFromPDF(buffer, filename)
  }
}
