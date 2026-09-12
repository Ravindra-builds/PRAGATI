/**
 * PRAGATI Data Lab - Validation & Prediction Readiness Engine.
 *
 * Validates normalized project records against ML inference domain constraints:
 * - Numerical ranges (0 <= progress <= 100, cost > 0, duration > 0)
 * - Milestone consistency (delayed <= total)
 * - Anti-leakage quarantine verification
 * - Distinguishes fatal errors from non-fatal warnings on real public data
 */

import {
  CanonicalProjectRecord,
  CANONICAL_FIELDS,
  ValidationReport,
  ValidationErrorItem,
  ValidationWarningItem,
  FORBIDDEN_OUTCOME_FIELDS,
} from './types'

export function validateCanonicalRecords(
  records: Partial<CanonicalProjectRecord>[]
): ValidationReport {
  const errors: ValidationErrorItem[] = []
  const warnings: ValidationWarningItem[] = []
  const requiredKeys = CANONICAL_FIELDS.filter(f => f.required).map(f => f.key)

  let validCount = 0
  let invalidCount = 0

  records.forEach((rec, index) => {
    let recordHasCriticalError = false
    const projectId = rec.project_id || `ROW-${index + 1}`

    // 1. Check for forbidden outcome columns in unmapped fields (Anti-leakage quarantine)
    if (rec.unmapped_fields) {
      for (const unmappedKey of Object.keys(rec.unmapped_fields)) {
        const lowerKey = unmappedKey.toLowerCase()
        if (FORBIDDEN_OUTCOME_FIELDS.some(forbidden => lowerKey.includes(forbidden))) {
          warnings.push({
            recordIndex: index,
            projectId,
            field: unmappedKey,
            value: rec.unmapped_fields[unmappedKey],
            message: `Target outcome column "${unmappedKey}" was detected and strictly quarantined from ML prediction inputs.`,
          })
          delete rec.unmapped_fields[unmappedKey]
        }
      }
    }

    // 2. Check for missing required canonical fields
    for (const reqKey of requiredKeys) {
      const val = rec[reqKey]
      if (val === undefined || val === null || val === '') {
        errors.push({
          recordIndex: index,
          projectId,
          field: reqKey,
          value: val,
          message: `Missing required canonical field "${reqKey}".`,
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    // 3. Domain validation for numeric ranges
    if (rec.original_cost_cr !== undefined) {
      if (typeof rec.original_cost_cr !== 'number' || isNaN(rec.original_cost_cr) || rec.original_cost_cr <= 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'original_cost_cr',
          value: rec.original_cost_cr,
          message: 'Original cost must be a positive number greater than 0 ₹ Cr.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    if (rec.planned_duration_months !== undefined) {
      if (typeof rec.planned_duration_months !== 'number' || isNaN(rec.planned_duration_months) || rec.planned_duration_months <= 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'planned_duration_months',
          value: rec.planned_duration_months,
          message: 'Planned duration must be a positive integer greater than 0 months.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    if (rec.elapsed_months !== undefined) {
      if (typeof rec.elapsed_months !== 'number' || isNaN(rec.elapsed_months) || rec.elapsed_months < 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'elapsed_months',
          value: rec.elapsed_months,
          message: 'Elapsed months cannot be negative.',
          isCritical: true,
        })
        recordHasCriticalError = true
      } else if (rec.planned_duration_months && rec.elapsed_months > rec.planned_duration_months) {
        // Real public data note: project is already in delay beyond planned timeline
        warnings.push({
          recordIndex: index,
          projectId,
          field: 'elapsed_months',
          value: rec.elapsed_months,
          message: `Elapsed duration (${rec.elapsed_months} mo) exceeds planned duration (${rec.planned_duration_months} mo). The project has already breached its baseline timeline.`,
        })
      }
    }

    if (rec.physical_progress_pct !== undefined) {
      if (typeof rec.physical_progress_pct !== 'number' || isNaN(rec.physical_progress_pct) || rec.physical_progress_pct < 0 || rec.physical_progress_pct > 100) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'physical_progress_pct',
          value: rec.physical_progress_pct,
          message: 'Physical progress must be between 0.0% and 100.0%.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    if (rec.financial_progress_pct !== undefined) {
      if (typeof rec.financial_progress_pct !== 'number' || isNaN(rec.financial_progress_pct) || rec.financial_progress_pct < 0 || rec.financial_progress_pct > 100) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'financial_progress_pct',
          value: rec.financial_progress_pct,
          message: 'Financial progress must be between 0.0% and 100.0%.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    if (rec.expenditure_cr !== undefined) {
      if (typeof rec.expenditure_cr !== 'number' || isNaN(rec.expenditure_cr) || rec.expenditure_cr < 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'expenditure_cr',
          value: rec.expenditure_cr,
          message: 'Cumulative expenditure cannot be negative.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
    }

    if (rec.milestones_total !== undefined && rec.milestones_delayed !== undefined) {
      if (rec.milestones_total < 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'milestones_total',
          value: rec.milestones_total,
          message: 'Total milestones count cannot be negative.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
      if (rec.milestones_delayed < 0) {
        errors.push({
          recordIndex: index,
          projectId,
          field: 'milestones_delayed',
          value: rec.milestones_delayed,
          message: 'Delayed milestones count cannot be negative.',
          isCritical: true,
        })
        recordHasCriticalError = true
      }
      if (rec.milestones_delayed > rec.milestones_total) {
        warnings.push({
          recordIndex: index,
          projectId,
          field: 'milestones_delayed',
          value: rec.milestones_delayed,
          message: `Delayed milestones (${rec.milestones_delayed}) exceeds total planned milestones (${rec.milestones_total}). Adjusted for calculation.`,
        })
      }
    }

    if (recordHasCriticalError) {
      invalidCount++
    } else {
      validCount++
    }
  })

  // Identify missing required canonical fields across entire dataset
  const presentKeys = new Set<string>()
  records.forEach(r => Object.keys(r).forEach(k => presentKeys.add(k)))
  const missingRequiredAcrossAll = requiredKeys.filter(k => !presentKeys.has(k))

  return {
    isValid: errors.length === 0,
    predictionReady: errors.filter(e => e.isCritical).length === 0 && validCount > 0,
    totalRecords: records.length,
    validRecordCount: validCount,
    invalidRecordCount: invalidCount,
    errors,
    warnings,
    missingRequiredFields: missingRequiredAcrossAll,
  }
}
