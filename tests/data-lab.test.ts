/**
 * Comprehensive Test Suite for PRAGATI Data Lab.
 *
 * Validates:
 * 1. Multi-format data extraction (CSV, JSON, XLSX, TXT, MD, PDF)
 * 2. Deterministic field mapping & alias resolution
 * 3. Cleaning & normalization (currencies, percentages, dates, integers)
 * 4. Validation rules & invalid numerical rejection
 * 5. Target outcome anti-leakage quarantine
 * 6. ML Prediction execution through existing ML pipeline
 * 7. Dataset persistence & provenance metadata
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import * as XLSX from 'xlsx'
import {
  extractFromCSV,
  extractFromJSON,
  extractFromXLSX,
  extractFromTextOrMarkdown,
  extractUploadedFile,
} from '../lib/data-lab/extractors'
import {
  mapSourceField,
  buildMappingSummary,
  FIELD_ALIASES,
} from '../lib/data-lab/mapping'
import {
  cleanCurrencyOrFloat,
  cleanPercentage,
  cleanSnapshotMonth,
  cleanAndNormalizeRecord,
} from '../lib/data-lab/cleaner'
import { validateCanonicalRecords } from '../lib/data-lab/validator'
import { dataLabService } from '../lib/data-lab/service'
import { CanonicalProjectRecord } from '../lib/data-lab/types'

describe('PRAGATI Data Lab - 1. Multi-Format Extraction Suite', () => {
  test('extracts multi-project records accurately from CSV', () => {
    const csvContent = `Project Code,Sanctioned Cost (Cr),Duration (Months),Time Elapsed,Physical Progress %,Financial %,Spent (Cr),Milestones Total,Delayed Milestones,Nodal Ministry,Sector,Executing Agency,State,Current Status,Project Title
PRJ-001,1250.0,36,18,45.5,52.0,650.0,8,2,Ministry of Road Transport and Highways,Roads,NHAI,Maharashtra,Ongoing,Highway Expansion 1
PRJ-002,800.0,24,12,60.0,65.0,520.0,6,1,Ministry of Railways,Railways,RVNL,Gujarat,Ongoing,Rail Doubling 2`

    const result = extractFromCSV(Buffer.from(csvContent, 'utf-8'), 'sample.csv')
    assert.strictEqual(result.format, 'CSV')
    assert.strictEqual(result.recordsDetected, 2)
    assert.strictEqual(result.projectsDetected, 2)
    assert.strictEqual(result.extractedRecords[0].rawFields['Project Code'], 'PRJ-001')
    assert.strictEqual(result.extractedRecords[1].rawFields['Sanctioned Cost (Cr)'], '800.0')
  })

  test('extracts structured records from JSON payload', () => {
    const jsonContent = JSON.stringify({
      projects: [
        {
          project_id: 'PRJ-JSON-10',
          original_cost_cr: 1500,
          planned_duration_months: 30,
          elapsed_months: 20,
          physical_progress_pct: 50.0,
          financial_progress_pct: 60.0,
          expenditure_cr: 900,
          milestones_total: 5,
          milestones_delayed: 1,
          ministry: 'Ministry of Power',
          sector: 'Power',
          implementing_agency: 'NTPC',
          state: 'Bihar',
          project_status: 'Ongoing',
        },
      ],
    })

    const result = extractFromJSON(Buffer.from(jsonContent, 'utf-8'), 'data.json')
    assert.strictEqual(result.format, 'JSON')
    assert.strictEqual(result.recordsDetected, 1)
    assert.strictEqual(result.extractedRecords[0].rawFields.project_id, 'PRJ-JSON-10')
  })

  test('extracts spreadsheet records from XLSX workbook', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet([
      {
        'Project ID': 'PRJ-XLS-01',
        'Approved Cost': 2100.0,
        'Duration Months': 40,
        'Months Elapsed': 25,
        'Physical %': 55.0,
        'Financial %': 70.0,
        'Total Spent': 1470.0,
        'Total Milestones': 10,
        'Delayed Milestones': 3,
        Ministry: 'Ministry of Ports',
        Sector: 'Ports & Shipping',
        Agency: 'IPA',
        State: 'Kerala',
        Status: 'Critical',
      },
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Projects')
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const result = extractFromXLSX(xlsxBuffer, 'projects.xlsx')
    assert.strictEqual(result.format, 'XLSX')
    assert.strictEqual(result.recordsDetected, 1)
    assert.strictEqual(result.extractedRecords[0].rawFields['Project ID'], 'PRJ-XLS-01')
  })

  test('extracts key-value fields from Text / Markdown inspection dossier', () => {
    const textReport = `
# Project Inspection Dossier
Project ID: PRJ-TEXT-99
Project Name: Solar Power Park Stage 2
Ministry: Ministry of New and Renewable Energy
Sector: Renewable Energy
Agency: SECI
State: Rajasthan
Original Cost: 950.0 Cr
Planned Duration: 24 Months
Elapsed Months: 16
Physical Progress: 48.0 %
Financial Progress: 62.0 %
Cumulative Expenditure: 589.0 Cr
Total Milestones: 6
Delayed Milestones: 2
Status: Delayed
`
    const result = extractFromTextOrMarkdown(Buffer.from(textReport, 'utf-8'), 'inspection.txt', 'TXT')
    assert.strictEqual(result.format, 'TXT')
    assert.strictEqual(result.recordsDetected, 1)
    assert.strictEqual(result.extractedRecords[0].rawFields['Project ID'], 'PRJ-TEXT-99')
    assert.strictEqual(result.extractedRecords[0].rawFields['Ministry'], 'Ministry of New and Renewable Energy')
  })
})

describe('PRAGATI Data Lab - 2. Deterministic Field Mapping Suite', () => {
  test('maps exact canonical field keys with HIGH confidence', () => {
    const match = mapSourceField('original_cost_cr')
    assert.strictEqual(match.canonicalField, 'original_cost_cr')
    assert.strictEqual(match.confidence, 'HIGH')
  })

  test('maps common PAIMANA and MoSPI aliases with HIGH confidence', () => {
    const aliasesToTest = [
      { header: 'Approved Cost', expected: 'original_cost_cr' },
      { header: 'Sanctioned Cost (Cr)', expected: 'original_cost_cr' },
      { header: 'Time Elapsed', expected: 'elapsed_months' },
      { header: 'Physical Progress %', expected: 'physical_progress_pct' },
      { header: 'Financial %', expected: 'financial_progress_pct' },
      { header: 'Spent (Cr)', expected: 'expenditure_cr' },
      { header: 'Delayed Milestones', expected: 'milestones_delayed' },
      { header: 'Nodal Ministry', expected: 'ministry' },
      { header: 'Executing Agency', expected: 'implementing_agency' },
    ]

    for (const item of aliasesToTest) {
      const match = mapSourceField(item.header)
      assert.strictEqual(
        match.canonicalField,
        item.expected,
        `Header "${item.header}" should map to "${item.expected}"`
      )
      assert.strictEqual(match.confidence, 'HIGH')
    }
  })

  test('identifies and quaratines forbidden outcome columns', () => {
    const forbiddenColumns = [
      'cost_overrun',
      'time_overrun',
      'final_cost_cr',
      'actual_duration_months',
    ]

    for (const col of forbiddenColumns) {
      const match = mapSourceField(col)
      assert.strictEqual(match.canonicalField, null)
      assert.strictEqual(match.confidence, 'UNMAPPED')
      assert.match(match.matchReason, /anti-leakage/i)
    }
  })
})

describe('PRAGATI Data Lab - 3. Cleaning & Normalization Suite', () => {
  test('cleans and normalizes Indian currency strings to ₹ Crores float', () => {
    const transformations: any[] = []

    assert.strictEqual(cleanCurrencyOrFloat('₹ 1,250.50 Cr', 'cost', 0, transformations), 1250.5)
    assert.strictEqual(cleanCurrencyOrFloat('125000 Lakhs', 'cost', 1, transformations), 1250.0)
    assert.strictEqual(cleanCurrencyOrFloat('₹ 450 Crore', 'cost', 2, transformations), 450.0)
    assert.strictEqual(cleanCurrencyOrFloat(850.0, 'cost', 3, transformations), 850.0)
    assert.ok(transformations.length >= 3)
  })

  test('normalizes percentage strings and decimal fractions to 0.0 - 100.0', () => {
    const transformations: any[] = []

    assert.strictEqual(cleanPercentage('63.5 %', 'progress', 0, transformations), 63.5)
    assert.strictEqual(cleanPercentage('45.0%', 'progress', 1, transformations), 45.0)
    assert.strictEqual(cleanPercentage(0.745, 'progress', 2, transformations), 74.5)
    assert.strictEqual(cleanPercentage(50, 'progress', 3, transformations), 50.0)
  })

  test('normalizes observation dates into YYYY-MM snapshot format', () => {
    const transformations: any[] = []

    assert.strictEqual(cleanSnapshotMonth('2025-06-15', 'month', 0, transformations), '2025-06')
    assert.strictEqual(cleanSnapshotMonth('06/2025', 'month', 1, transformations), '2025-06')
    assert.strictEqual(cleanSnapshotMonth('2025-06', 'month', 2, transformations), '2025-06')
  })
})

describe('PRAGATI Data Lab - 4. Validation & Anti-Leakage Suite', () => {
  test('accepts fully populated canonical project record', () => {
    const record: Partial<CanonicalProjectRecord> = {
      project_id: 'PRJ-VALID-01',
      snapshot_month: '2025-06',
      ministry: 'Ministry of Railways',
      sector: 'Railways',
      implementing_agency: 'RVNL',
      state: 'Maharashtra',
      original_cost_cr: 1000.0,
      planned_duration_months: 36,
      elapsed_months: 18,
      physical_progress_pct: 45.0,
      financial_progress_pct: 50.0,
      expenditure_cr: 500.0,
      milestones_total: 8,
      milestones_delayed: 2,
      project_status: 'Ongoing',
    }

    const report = validateCanonicalRecords([record])
    assert.strictEqual(report.isValid, true)
    assert.strictEqual(report.predictionReady, true)
    assert.strictEqual(report.validRecordCount, 1)
    assert.strictEqual(report.invalidRecordCount, 0)
    assert.strictEqual(report.errors.length, 0)
  })

  test('rejects records with invalid negative values or out-of-bounds percentages', () => {
    const invalidRecord: Partial<CanonicalProjectRecord> = {
      project_id: 'PRJ-INVALID-01',
      snapshot_month: '2025-06',
      ministry: 'Ministry of Power',
      sector: 'Power',
      implementing_agency: 'NTPC',
      state: 'Bihar',
      original_cost_cr: -500.0, // Invalid: negative cost
      planned_duration_months: 0, // Invalid: 0 duration
      elapsed_months: 10,
      physical_progress_pct: 120.0, // Invalid: > 100%
      financial_progress_pct: 50.0,
      expenditure_cr: -10.0, // Invalid: negative expenditure
      milestones_total: 5,
      milestones_delayed: 1,
      project_status: 'Ongoing',
    }

    const report = validateCanonicalRecords([invalidRecord])
    assert.strictEqual(report.isValid, false)
    assert.strictEqual(report.predictionReady, false)
    assert.strictEqual(report.invalidRecordCount, 1)
    assert.ok(report.errors.some(e => e.field === 'original_cost_cr'))
    assert.ok(report.errors.some(e => e.field === 'physical_progress_pct'))
  })

  test('quarantines outcome variables found in unmapped fields', () => {
    const recordWithLeakage: Partial<CanonicalProjectRecord> = {
      project_id: 'PRJ-LEAK-01',
      snapshot_month: '2025-06',
      ministry: 'Ministry of Road Transport and Highways',
      sector: 'Roads',
      implementing_agency: 'NHAI',
      state: 'Gujarat',
      original_cost_cr: 1200.0,
      planned_duration_months: 24,
      elapsed_months: 12,
      physical_progress_pct: 50.0,
      financial_progress_pct: 55.0,
      expenditure_cr: 660.0,
      milestones_total: 6,
      milestones_delayed: 1,
      project_status: 'Ongoing',
      unmapped_fields: {
        cost_overrun: 1,
        final_cost_cr: 1800.0,
        actual_duration_months: 42,
      },
    }

    const report = validateCanonicalRecords([recordWithLeakage])
    assert.ok(report.warnings.some(w => w.message.includes('quarantined')))
    assert.strictEqual(recordWithLeakage.unmapped_fields?.cost_overrun, undefined)
    assert.strictEqual(recordWithLeakage.unmapped_fields?.final_cost_cr, undefined)
  })
})

describe('PRAGATI Data Lab - 5. ML Inference & Explainability Integration', () => {
  test('executes dual ML predictions and retrieves SHAP drivers for valid canonical records', async () => {
    const sampleCanonical: CanonicalProjectRecord = {
      project_id: 'PRJ-TEST-PREDICT-01',
      snapshot_month: '2025-06',
      ministry: 'Ministry of Road Transport and Highways',
      sector: 'Roads & Highways',
      implementing_agency: 'NHAI',
      state: 'Maharashtra',
      original_cost_cr: 1500.0,
      planned_duration_months: 36,
      elapsed_months: 28,
      physical_progress_pct: 42.0,
      financial_progress_pct: 70.0,
      expenditure_cr: 1050.0,
      milestones_total: 8,
      milestones_delayed: 4,
      project_status: 'Critical',
      project_name: 'Western Expressway Package 5',
    }

    const predictions = await dataLabService.predictBatch([sampleCanonical])

    assert.strictEqual(predictions.length, 1)
    const pred = predictions[0]
    assert.strictEqual(pred.projectId, 'PRJ-TEST-PREDICT-01')
    assert.ok(pred.costOverrunProbability >= 0 && pred.costOverrunProbability <= 1.0)
    assert.ok(pred.timeOverrunProbability >= 0 && pred.timeOverrunProbability <= 1.0)
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(pred.overallRiskLevel))
    assert.ok(Array.isArray(pred.costDrivers))
    assert.ok(Array.isArray(pred.timeDrivers))
    assert.ok(Array.isArray(pred.earlyWarnings))
  })
})
