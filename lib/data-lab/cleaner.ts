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

const MOSPI_MINISTRY_MAP: Record<string, string> = {
  'ministry of road transport & highways': 'Ministry of Road Transport and Highways',
  'ministry of road transport and highways': 'Ministry of Road Transport and Highways',
  'morth': 'Ministry of Road Transport and Highways',
  'ministry of housing & urban affairs': 'Ministry of Housing and Urban Affairs',
  'ministry of housing and urban affairs': 'Ministry of Housing and Urban Affairs',
  'mohua': 'Ministry of Housing and Urban Affairs',
  'ministry of petroleum & natural gas': 'Ministry of Petroleum and Natural Gas',
  'ministry of petroleum and natural gas': 'Ministry of Petroleum and Natural Gas',
  'ministry of ports, shipping and waterways': 'Ministry of Ports, Shipping and Waterways',
  'ministry of shipping': 'Ministry of Ports, Shipping and Waterways',
  'department of water resources, river development & ganga rejuvenation': 'Ministry of Jal Shakti',
  'department of drinking water and sanitation': 'Ministry of Jal Shakti',
  'ministry of jal shakti': 'Ministry of Jal Shakti',
  'ministry of railways': 'Ministry of Railways',
  'ministry of power': 'Ministry of Power',
  'ministry of civil aviation': 'Ministry of Civil Aviation',
  'ministry of coal': 'Ministry of Coal',
}

const MOSPI_SECTOR_MAP: Record<string, string> = {
  'roads & highways': 'Roads & Highways',
  'road transport and highways': 'Roads & Highways',
  'railways': 'Railways',
  'power': 'Power',
  'urban development': 'Urban Development',
  'urban transport': 'Urban Development',
  'housing & urban affairs': 'Urban Development',
  'petroleum & natural gas': 'Petroleum',
  'petroleum': 'Petroleum',
  'civil aviation': 'Civil Aviation',
  'ports & shipping': 'Ports & Shipping',
  'shipping and ports': 'Ports & Shipping',
  'water resources': 'Water Resources',
  'coal': 'Coal',
}

const MOSPI_AGENCY_PATTERNS: Array<{ match: string; canonical: string }> = [
  { match: 'nhai', canonical: 'NHAI' },
  { match: 'national highways authority', canonical: 'NHAI' },
  { match: 'nhidcl', canonical: 'NHIDCL' },
  { match: 'morth', canonical: 'MoRTH' },
  { match: 'pwd', canonical: 'MoRTH' },
  { match: 'rvnl', canonical: 'RVNL' },
  { match: 'ircon', canonical: 'IRCON' },
  { match: 'dfccil', canonical: 'DFCCIL' },
  { match: 'ntpc', canonical: 'NTPC' },
  { match: 'nlcil', canonical: 'NTPC' },
  { match: 'thdc', canonical: 'NHPC' },
  { match: 'sjvn', canonical: 'NHPC' },
  { match: 'nhpc', canonical: 'NHPC' },
  { match: 'pgcil', canonical: 'PGCIL' },
  { match: 'power grid', canonical: 'PGCIL' },
  { match: 'aai', canonical: 'AAI' },
  { match: 'airport authority', canonical: 'AAI' },
  { match: 'iocl', canonical: 'IOCL' },
  { match: 'indian oil', canonical: 'IOCL' },
  { match: 'ongc', canonical: 'ONGC' },
  { match: 'gail', canonical: 'GAIL' },
  { match: 'hpcl', canonical: 'BPCL' },
  { match: 'bpcl', canonical: 'BPCL' },
  { match: 'bmrcl', canonical: 'BMRCL' },
  { match: 'mmrcl', canonical: 'MMRCL' },
  { match: 'mmrc', canonical: 'MMRCL' },
  { match: 'dmrc', canonical: 'DMRC' },
  { match: 'cmrl', canonical: 'DMRC' },
  { match: 'gmrcl', canonical: 'DMRC' },
  { match: 'ncrtc', canonical: 'DMRC' },
  { match: 'nbcc', canonical: 'NBCC' },
  { match: 'cpwd', canonical: 'CPWD' },
  { match: 'secl', canonical: 'SECL' },
  { match: 'mcl', canonical: 'MCL' },
  { match: 'cil', canonical: 'CIL' },
  { match: 'ccl', canonical: 'CIL' },
  { match: 'ncl', canonical: 'CIL' },
]

function parseYearMonth(val: unknown): { year: number; month: number } | null {
  if (!val) return null
  const s = String(val).trim()
  const ymMatch = s.match(/^(\d{4})[/.-](\d{1,2})/)
  if (ymMatch) {
    return { year: parseInt(ymMatch[1], 10), month: parseInt(ymMatch[2], 10) }
  }
  const myMatch = s.match(/^(\d{1,2})[/.-](\d{4})$/)
  if (myMatch) {
    return { year: parseInt(myMatch[2], 10), month: parseInt(myMatch[1], 10) }
  }
  return null
}

function monthsBetween(
  start: { year: number; month: number },
  end: { year: number; month: number }
): number {
  return (end.year - start.year) * 12 + (end.month - start.month)
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

  // Track which canonical fields were explicitly present in the source mapping
  const explicitlyMappedKeys = new Set<CanonicalFieldKey>()

  // 1. Apply mapped canonical fields
  for (const [srcKey, canonicalKey] of Object.entries(mapping)) {
    if (!canonicalKey) continue
    const rawVal = rawRecord[srcKey]
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      explicitlyMappedKeys.add(canonicalKey)
    }

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

  // 3. Canonicalize official MoSPI PAIMANA Ministry, Sector, and Agency strings
  if (result.ministry) {
    const normMin = MOSPI_MINISTRY_MAP[result.ministry.toLowerCase().trim()]
    if (normMin && normMin !== result.ministry) {
      transformations.push({
        recordIndex,
        field: 'ministry',
        originalValue: result.ministry,
        cleanedValue: normMin,
        rule: 'Standardized official MoSPI PAIMANA ministry nomenclature',
      })
      result.ministry = normMin
    }
  }

  if (result.sector) {
    const normSec = MOSPI_SECTOR_MAP[result.sector.toLowerCase().trim()]
    if (normSec && normSec !== result.sector) {
      transformations.push({
        recordIndex,
        field: 'sector',
        originalValue: result.sector,
        cleanedValue: normSec,
        rule: 'Standardized official MoSPI PAIMANA sector domain',
      })
      result.sector = normSec
    }
  }

  if (result.implementing_agency) {
    const rawAgency = result.implementing_agency.trim()
    const bracketMatch = rawAgency.match(/\[([A-Za-z0-9&-]+)\]/)
    const parenCleaned = bracketMatch ? bracketMatch[1] : rawAgency.replace(/^[()[\]]+|[()[\]]+$/g, '').trim()
    const lowerAgency = parenCleaned.toLowerCase()
    let mappedAgency = parenCleaned
    for (const p of MOSPI_AGENCY_PATTERNS) {
      if (lowerAgency.includes(p.match)) {
        mappedAgency = p.canonical
        break
      }
    }
    if (mappedAgency !== result.implementing_agency) {
      transformations.push({
        recordIndex,
        field: 'implementing_agency',
        originalValue: result.implementing_agency,
        cleanedValue: mappedAgency,
        rule: 'Canonicalized MoSPI executing agency identifier',
      })
      result.implementing_agency = mappedAgency
    }
  }

  // 4. PAIMANA Date-to-Months Auto-Derivation (if Start Date / Approval Date & Original DoC are provided instead of integer months)
  if (!result.planned_duration_months || !result.elapsed_months) {
    const lowerRaw: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rawRecord)) {
      lowerRaw[k.toLowerCase().trim()] = v
    }
    const rawStart =
      lowerRaw['start_date'] ||
      lowerRaw['start date'] ||
      lowerRaw['date_of_approval'] ||
      lowerRaw['date of approval'] ||
      lowerRaw['approval_date'] ||
      lowerRaw['approval date']
    const rawOrigDoc =
      lowerRaw['original_doc'] ||
      lowerRaw['original doc'] ||
      lowerRaw['original_date_of_commissioning'] ||
      lowerRaw['original date of commissioning'] ||
      lowerRaw['target_doc'] ||
      lowerRaw['scheduled_doc']

    const startYm = parseYearMonth(rawStart)
    const origDocYm = parseYearMonth(rawOrigDoc)
    const snapYm = parseYearMonth(result.snapshot_month)

    if (!result.planned_duration_months && startYm && origDocYm) {
      const derivedPlanned = Math.max(6, monthsBetween(startYm, origDocYm))
      result.planned_duration_months = derivedPlanned
      transformations.push({
        recordIndex,
        field: 'planned_duration_months',
        originalValue: `${String(rawStart)} -> ${String(rawOrigDoc)}`,
        cleanedValue: derivedPlanned,
        rule: 'Defaulted planned_duration_months from PAIMANA Start Date and Original DoC',
      })
    }

    if (!result.elapsed_months && startYm && snapYm) {
      const derivedElapsed = Math.max(1, monthsBetween(startYm, snapYm))
      result.elapsed_months = derivedElapsed
      transformations.push({
        recordIndex,
        field: 'elapsed_months',
        originalValue: `${String(rawStart)} -> ${result.snapshot_month}`,
        cleanedValue: derivedElapsed,
        rule: 'Defaulted elapsed_months from PAIMANA Start Date and Snapshot Month',
      })
    }
  }

  // 5. Financial Progress Auto-Derivation (Official PAIMANA tables provide Original Cost & Cumulative Expenditure)
  if (
    (!explicitlyMappedKeys.has('financial_progress_pct') || !result.financial_progress_pct) &&
    result.original_cost_cr &&
    result.original_cost_cr > 0 &&
    result.expenditure_cr !== undefined &&
    result.expenditure_cr >= 0
  ) {
    const derivedFinPct = Number(
      Math.min(100, (result.expenditure_cr / result.original_cost_cr) * 100).toFixed(2)
    )
    result.financial_progress_pct = derivedFinPct
    transformations.push({
      recordIndex,
      field: 'financial_progress_pct',
      originalValue: null,
      cleanedValue: derivedFinPct,
      rule: 'Defaulted financial_progress_pct from Cumulative Expenditure / Original Cost',
    })
  }

  // 6. Milestones & Project Status Auto-Derivation for Public PAIMANA Reports (which omit internal CRIP milestone counts)
  const hasCorePaimanaTelemetry =
    Boolean(result.original_cost_cr && result.original_cost_cr > 0) &&
    Boolean(result.planned_duration_months && result.planned_duration_months > 0) &&
    Boolean(result.elapsed_months && result.elapsed_months > 0) &&
    result.physical_progress_pct !== undefined

  if (hasCorePaimanaTelemetry) {
    if (!explicitlyMappedKeys.has('milestones_total') || !result.milestones_total || result.milestones_total <= 0) {
      result.milestones_total = 10
      transformations.push({
        recordIndex,
        field: 'milestones_total',
        originalValue: null,
        cleanedValue: 10,
        rule: 'Defaulted milestones_total to standard 10-stage PAIMANA lifecycle baseline',
      })
    }

    if (!explicitlyMappedKeys.has('milestones_delayed') || result.milestones_delayed === undefined) {
      const plannedDur = Math.max(1, result.planned_duration_months || 36)
      const elapsedDur = Math.max(1, result.elapsed_months || 12)
      const physPct = result.physical_progress_pct ?? 0
      const schedPct = (elapsedDur / plannedDur) * 100
      const schedGap = schedPct - physPct
      const overTimeRatio = Math.max(0, (elapsedDur - plannedDur) / plannedDur)
      const totalMs = result.milestones_total || 10

      let estDelayed = 0
      let derivedStatus = result.project_status || 'Ongoing'

      if (elapsedDur > plannedDur * 1.1) {
        estDelayed = Math.min(totalMs, Math.max(3, Math.round(overTimeRatio * 8 + Math.max(0, schedGap) / 20)))
        if (!explicitlyMappedKeys.has('project_status') || !result.project_status) {
          derivedStatus = elapsedDur > plannedDur * 1.25 ? 'Critical' : 'Delayed'
        }
      } else if (schedGap > 20) {
        estDelayed = Math.min(totalMs, Math.max(2, Math.round((schedGap / 100) * 8)))
        if (!explicitlyMappedKeys.has('project_status') || !result.project_status) {
          derivedStatus = 'Delayed'
        }
      } else if (schedGap > 8) {
        estDelayed = 1
      }

      result.milestones_delayed = Math.max(0, Math.min(totalMs, estDelayed))
      transformations.push({
        recordIndex,
        field: 'milestones_delayed',
        originalValue: null,
        cleanedValue: result.milestones_delayed,
        rule: 'Defaulted milestones_delayed from PAIMANA schedule-progress gap proxy',
      })

      if (!explicitlyMappedKeys.has('project_status') || !result.project_status) {
        result.project_status = derivedStatus
        transformations.push({
          recordIndex,
          field: 'project_status',
          originalValue: null,
          cleanedValue: derivedStatus,
          rule: 'Defaulted project_status from PAIMANA schedule slippage threshold',
        })
      }
    } else if (!result.project_status) {
      result.project_status = 'Ongoing'
    }
  }

  // 7. Collect unmapped fields
  for (const [srcKey, rawVal] of Object.entries(rawRecord)) {
    if (!mapping[srcKey]) {
      result.unmapped_fields![srcKey] = rawVal
    }
  }

  return result
}
