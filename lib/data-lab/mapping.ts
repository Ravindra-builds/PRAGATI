/**
 * PRAGATI Data Lab - Deterministic Field Mapping Engine.
 *
 * Maps source field names from public reports, PAIMANA/OCMS formats, and datasets
 * to the PRAGATI canonical schema.
 * Computes match confidence and prevents silent guesswork on numerical inputs.
 */

import {
  CanonicalFieldKey,
  CANONICAL_FIELDS,
  FieldMapping,
  MappingConfidence,
  MappingSummary,
  FORBIDDEN_OUTCOME_FIELDS,
} from './types'

// Aliases dictionary mapping known header names to canonical schema keys
export const FIELD_ALIASES: Record<CanonicalFieldKey, string[]> = {
  project_id: [
    'project_id',
    'projectid',
    'project_code',
    'projectcode',
    'proj_id',
    'id',
    'sanction_id',
    'code',
    'project number',
    'project_no',
    'project no',
  ],
  snapshot_month: [
    'snapshot_month',
    'snapshotmonth',
    'month',
    'reporting_month',
    'report_month',
    'observation_month',
    'as_on_date',
    'as_on_month',
    'period',
    'monitoring_month',
    'date',
    'snapshot_date',
  ],
  ministry: [
    'ministry',
    'nodal_ministry',
    'ministry_name',
    'central_ministry',
    'department',
    'dept',
    'ministry / department',
  ],
  sector: [
    'sector',
    'infrastructure_sector',
    'sector_name',
    'domain',
    'industry',
    'category',
  ],
  implementing_agency: [
    'implementing_agency',
    'agency',
    'executing_agency',
    'psu',
    'authority',
    'concessionaire',
    'contractor',
    'developer',
    'organization',
    'org',
  ],
  state: [
    'state',
    'state_ut',
    'location',
    'state/ut',
    'region',
    'geography',
    'state_name',
  ],
  original_cost_cr: [
    'original_cost_cr',
    'original_cost',
    'originalcost',
    'approved_cost',
    'approved_cost_cr',
    'sanctioned_cost',
    'sanction_cost_cr',
    'original_sanction',
    'sanctioned_cost_cr',
    'initial_cost',
    'original estimated cost',
    'original_estimate',
    'cost_cr',
    'original budget',
  ],
  planned_duration_months: [
    'planned_duration_months',
    'planned_duration',
    'contractual_duration',
    'sanctioned_duration',
    'original_duration_months',
    'planned_months',
    'schedule_months',
    'approved_duration',
    'original_duration',
    'contract_duration_months',
  ],
  elapsed_months: [
    'elapsed_months',
    'elapsed_time',
    'months_elapsed',
    'time_elapsed',
    'duration_elapsed',
    'execution_months',
    'months_since_start',
    'elapsed',
  ],
  physical_progress_pct: [
    'physical_progress_pct',
    'physical_progress',
    'physical_progress_%',
    'physical_%',
    'physical_completion_pct',
    'physical progress',
    'work_done_pct',
    'work_progress_%',
    'physical %',
  ],
  financial_progress_pct: [
    'financial_progress_pct',
    'financial_progress',
    'financial_progress_%',
    'financial_%',
    'financial_utilization_pct',
    'financial progress',
    'budget_spent_pct',
    'fund_utilization_pct',
    'financial %',
  ],
  expenditure_cr: [
    'expenditure_cr',
    'expenditure',
    'cumulative_expenditure',
    'total_expenditure_cr',
    'expenditure_incurred',
    'actual_expenditure_cr',
    'spent_cr',
    'total_spent',
    'cost_incurred',
  ],
  milestones_total: [
    'milestones_total',
    'total_milestones',
    'milestones',
    'planned_milestones',
    'no_of_milestones',
    'milestone_count',
    'target_milestones',
  ],
  milestones_delayed: [
    'milestones_delayed',
    'delayed_milestones',
    'milestones_slipping',
    'slipped_milestones',
    'lagging_milestones',
    'delayed_milestone_count',
  ],
  project_status: [
    'project_status',
    'status',
    'operational_status',
    'current_status',
    'state_of_project',
    'stage',
  ],
  project_name: [
    'project_name',
    'name',
    'project_title',
    'title',
    'asset_name',
    'scheme_name',
    'description',
  ],
}

/**
 * Normalizes field strings by lowering case and stripping punctuation.
 */
export function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[₹$€%_()/[\]\-.:#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Maps a single source field to a canonical field key with match confidence.
 */
export function mapSourceField(
  sourceField: string,
  sampleValues: any[] = []
): { canonicalField: CanonicalFieldKey | null; confidence: MappingConfidence; matchReason: string } {
  const normSource = normalizeFieldName(sourceField)
  const exactLower = sourceField.trim().toLowerCase()

  // Guard against mapping outcome columns
  if (FORBIDDEN_OUTCOME_FIELDS.includes(exactLower) || FORBIDDEN_OUTCOME_FIELDS.includes(normSource.replace(/\s+/g, '_'))) {
    return {
      canonicalField: null,
      confidence: 'UNMAPPED',
      matchReason: 'Excluded outcome column (anti-leakage quarantine)',
    }
  }

  // 1. Exact canonical key match
  for (const field of CANONICAL_FIELDS) {
    if (field.key.toLowerCase() === exactLower || field.key.toLowerCase() === normSource.replace(/\s+/g, '_')) {
      return {
        canonicalField: field.key,
        confidence: 'HIGH',
        matchReason: `Exact match with canonical key "${field.key}"`,
      }
    }
  }

  // 2. Exact label match
  for (const field of CANONICAL_FIELDS) {
    if (normalizeFieldName(field.label) === normSource) {
      return {
        canonicalField: field.key,
        confidence: 'HIGH',
        matchReason: `Matched canonical label "${field.label}"`,
      }
    }
  }

  // 3. Alias dictionary match
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const normAlias = normalizeFieldName(alias)
      if (normAlias === normSource || alias.toLowerCase() === exactLower) {
        return {
          canonicalField: key as CanonicalFieldKey,
          confidence: 'HIGH',
          matchReason: `Matched known alias "${alias}" for "${key}"`,
        }
      }
    }
  }

  // 4. Substring / Semantic heuristic match
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const normAlias = normalizeFieldName(alias)
      if (normSource.includes(normAlias) || normAlias.includes(normSource)) {
        return {
          canonicalField: key as CanonicalFieldKey,
          confidence: 'MEDIUM',
          matchReason: `Partial heuristic match on "${alias}"`,
        }
      }
    }
  }

  return {
    canonicalField: null,
    confidence: 'UNMAPPED',
    matchReason: 'No match in alias dictionary',
  }
}

/**
 * Builds the complete mapping summary for an extracted dataset.
 */
export function buildMappingSummary(
  rawFieldsList: Record<string, any>[]
): MappingSummary {
  if (rawFieldsList.length === 0) {
    return {
      totalSourceFields: 0,
      mappedRequiredCount: 0,
      totalRequiredCount: CANONICAL_FIELDS.filter(f => f.required).length,
      unmappedSourceFields: [],
      missingRequiredCanonical: CANONICAL_FIELDS.filter(f => f.required).map(f => f.key),
      mappings: [],
    }
  }

  // Collect all unique source fields
  const allSourceFields = new Set<string>()
  rawFieldsList.forEach(rec => {
    Object.keys(rec).forEach(k => allSourceFields.add(k))
  })

  const mappings: FieldMapping[] = []
  const mappedCanonicalSet = new Set<CanonicalFieldKey>()
  const unmappedSourceFields: string[] = []

  for (const srcField of allSourceFields) {
    const samples = rawFieldsList
      .map(r => r[srcField])
      .filter(v => v !== undefined && v !== null && v !== '')
      .slice(0, 3)

    const match = mapSourceField(srcField, samples)

    if (match.canonicalField && !mappedCanonicalSet.has(match.canonicalField)) {
      mappedCanonicalSet.add(match.canonicalField)
      mappings.push({
        sourceField: srcField,
        canonicalField: match.canonicalField,
        confidence: match.confidence,
        matchReason: match.matchReason,
        sampleValues: samples,
      })
    } else {
      mappings.push({
        sourceField: srcField,
        canonicalField: null,
        confidence: 'UNMAPPED',
        matchReason: match.canonicalField && mappedCanonicalSet.has(match.canonicalField)
          ? `Canonical field "${match.canonicalField}" already mapped`
          : match.matchReason,
        sampleValues: samples,
      })
      unmappedSourceFields.push(srcField)
    }
  }

  const requiredCanonical = CANONICAL_FIELDS.filter(f => f.required).map(f => f.key)
  const missingRequired = requiredCanonical.filter(k => !mappedCanonicalSet.has(k))

  return {
    totalSourceFields: allSourceFields.size,
    mappedRequiredCount: requiredCanonical.length - missingRequired.length,
    totalRequiredCount: requiredCanonical.length,
    unmappedSourceFields,
    missingRequiredCanonical: missingRequired,
    mappings,
  }
}
