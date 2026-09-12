/**
 * PRAGATI Data Lab - Cleaning & Normalization Engine.
 *
 * Sanitizes and normalizes raw values into typed canonical representations:
 * - Indian currency expressions ("₹ 1,250 Cr", "1,250.50", "Lakhs")
 * - Percentages ("63.5 %", "0.635")
 * - Dates to YYYY-MM
 * - Integer durations and milestone counters
 * Produces an audit log of every transformation applied.
 */

import {
  CanonicalProjectRecord,
  CanonicalFieldKey,
  CleaningTransformation,
} from './types'

/**
 * Normalizes currency and numeric string inputs into float in ₹ Crores.
 */
export function cleanCurrencyOrFloat(
  rawVal: unknown,
  fieldName: string,
  recordIndex: number,
  transformations: CleaningTransformation[]
): number | null {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return null
  }

  if (typeof rawVal === 'number') {
    return isNaN(rawVal) ? null : rawVal
  }

  const str = String(rawVal).trim()
  const lower = str.toLowerCase()

  // Detect multipliers
  let multiplier = 1.0
  let rule = 'Converted string to numeric'

  if (lower.includes('lakh') || lower.includes('lac')) {
    multiplier = 0.01 // 100 Lakh = 1 Crore
    rule = 'Normalized Lakhs to ₹ Crores (x0.01)'
  } else if (lower.includes('thousand') || lower.includes('k')) {
    multiplier = 0.0001
    rule = 'Normalized Thousands to ₹ Crores'
  }

  // Remove currency symbols, commas, quotes, 'cr', 'crore'
  const cleanedStr = str
    .replace(/[₹$€,\s"']/g, '')
    .replace(/(?:cr|crore|crores|lakh|lakhs|lacs)/gi, '')
    .trim()

  const num = parseFloat(cleanedStr)
  if (isNaN(num)) {
    return null
  }

  const finalVal = Number((num * multiplier).toFixed(4))
  if (rawVal !== finalVal) {
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: finalVal,
      rule,
    })
  }

  return finalVal
}

/**
 * Normalizes percentage strings and fractions into 0.0 - 100.0 range.
 */
export function cleanPercentage(
  rawVal: unknown,
  fieldName: string,
  recordIndex: number,
  transformations: CleaningTransformation[]
): number | null {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return null
  }

  if (typeof rawVal === 'number') {
    if (rawVal > 0 && rawVal <= 1.0) {
      const scaled = Number((rawVal * 100).toFixed(2))
      transformations.push({
        recordIndex,
        field: fieldName,
        originalValue: rawVal,
        cleanedValue: scaled,
        rule: 'Scaled decimal fraction (0.0-1.0) to percentage (0-100)',
      })
      return scaled
    }
    return Number(rawVal.toFixed(2))
  }

  const str = String(rawVal).trim()
  const cleanedStr = str.replace(/[%\s"']/g, '').trim()
  const num = parseFloat(cleanedStr)

  if (isNaN(num)) {
    return null
  }

  let finalVal = num
  if (num > 0 && num <= 1.0 && str.includes('.')) {
    finalVal = Number((num * 100).toFixed(2))
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: finalVal,
      rule: 'Scaled decimal fraction to percentage',
    })
  } else {
    finalVal = Number(num.toFixed(2))
    if (rawVal !== finalVal) {
      transformations.push({
        recordIndex,
        field: fieldName,
        originalValue: rawVal,
        cleanedValue: finalVal,
        rule: 'Normalized percentage string to numeric',
      })
    }
  }

  return finalVal
}

/**
 * Normalizes dates to YYYY-MM snapshot format.
 */
export function cleanSnapshotMonth(
  rawVal: unknown,
  fieldName: string,
  recordIndex: number,
  transformations: CleaningTransformation[]
): string {
  if (!rawVal) {
    const defaultMonth = new Date().toISOString().slice(0, 7)
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: defaultMonth,
      rule: 'Defaulted empty observation date to current month',
    })
    return defaultMonth
  }

  const str = String(rawVal).trim()

  // Match YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    return str
  }

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const yyyymm = str.slice(0, 7)
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: yyyymm,
      rule: 'Normalized YYYY-MM-DD to YYYY-MM',
    })
    return yyyymm
  }

  // Match MM/YYYY or MM-YYYY
  const mmyyyyMatch = str.match(/^(\d{1,2})[/.-](\d{4})$/)
  if (mmyyyyMatch) {
    const mm = mmyyyyMatch[1].padStart(2, '0')
    const yyyy = mmyyyyMatch[2]
    const yyyymm = `${yyyy}-${mm}`
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: yyyymm,
      rule: 'Normalized MM/YYYY to YYYY-MM',
    })
    return yyyymm
  }

  // Attempt JavaScript Date parse
  const parsedDate = new Date(str)
  if (!isNaN(parsedDate.getTime())) {
    const yyyymm = parsedDate.toISOString().slice(0, 7)
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: yyyymm,
      rule: 'Parsed textual date to YYYY-MM',
    })
    return yyyymm
  }

  return str
}

/**
 * Normalizes integer count fields.
 */
export function cleanInteger(
  rawVal: unknown,
  fieldName: string,
  recordIndex: number,
  transformations: CleaningTransformation[]
): number | null {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return null
  }

  if (typeof rawVal === 'number') {
    return Math.round(rawVal)
  }

  const str = String(rawVal).replace(/[^0-9.-]/g, '').trim()
  const num = parseInt(str, 10)

  if (isNaN(num)) {
    return null
  }

  if (rawVal !== num) {
    transformations.push({
      recordIndex,
      field: fieldName,
      originalValue: rawVal,
      cleanedValue: num,
      rule: 'Normalized to integer',
    })
  }

  return num
}

/**
 * Normalizes a raw extracted record into a clean canonical project record candidate.
 */
export function cleanAndNormalizeRecord(
  rawRecord: Record<string, unknown>,
  mapping: Record<string, CanonicalFieldKey>,
  recordIndex: number,
  transformations: CleaningTransformation[]
): Partial<CanonicalProjectRecord> {
  const result: Partial<CanonicalProjectRecord> = {
    unmapped_fields: {},
  }

  // 1. Apply mapped canonical fields
  for (const [srcKey, canonicalKey] of Object.entries(mapping)) {
    if (!canonicalKey) continue
    const rawVal = rawRecord[srcKey]

    switch (canonicalKey) {
      case 'project_id':
      case 'ministry':
      case 'sector':
      case 'implementing_agency':
      case 'state':
      case 'project_status':
      case 'project_name':
        result[canonicalKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : ''
        break

      case 'snapshot_month':
        result.snapshot_month = cleanSnapshotMonth(rawVal, canonicalKey, recordIndex, transformations)
        break

      case 'original_cost_cr':
      case 'expenditure_cr':
        result[canonicalKey] = cleanCurrencyOrFloat(rawVal, canonicalKey, recordIndex, transformations) ?? 0
        break

      case 'physical_progress_pct':
      case 'financial_progress_pct':
        result[canonicalKey] = cleanPercentage(rawVal, canonicalKey, recordIndex, transformations) ?? 0
        break

      case 'planned_duration_months':
      case 'elapsed_months':
      case 'milestones_total':
      case 'milestones_delayed':
        result[canonicalKey] = cleanInteger(rawVal, canonicalKey, recordIndex, transformations) ?? 0
        break
    }
  }

  // 2. Ensure observation date / snapshot_month defaults if omitted from public report
  if (!result.snapshot_month) {
    result.snapshot_month = cleanSnapshotMonth(null, 'snapshot_month', recordIndex, transformations)
  }

  // 3. Collect unmapped fields
  for (const [srcKey, rawVal] of Object.entries(rawRecord)) {
    if (!mapping[srcKey]) {
      result.unmapped_fields![srcKey] = rawVal
    }
  }

  return result
}
