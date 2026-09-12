/**
 * PRAGATI Data Lab Types & Interfaces.
 *
 * Defines the canonical project schema matching the ML inference service,
 * field mapping metadata, validation contracts, cleaning transformations,
 * and provenance audit metadata.
 */

export interface CanonicalProjectRecord {
  project_id: string
  snapshot_month: string // YYYY-MM
  ministry: string
  sector: string
  implementing_agency: string
  state: string
  original_cost_cr: number
  planned_duration_months: number
  elapsed_months: number
  physical_progress_pct: number
  financial_progress_pct: number
  expenditure_cr: number
  milestones_total: number
  milestones_delayed: number
  project_status: string
  // Optional display metadata
  project_name?: string
  unmapped_fields?: Record<string, any>
}

export type CanonicalFieldKey = keyof Omit<CanonicalProjectRecord, 'unmapped_fields'>

export interface CanonicalFieldDefinition {
  key: CanonicalFieldKey
  label: string
  type: 'string' | 'number' | 'date'
  required: boolean
  description: string
  example: string | number
}

export const CANONICAL_FIELDS: CanonicalFieldDefinition[] = [
  {
    key: 'project_id',
    label: 'Project Identifier',
    type: 'string',
    required: true,
    description: 'Unique project code or sanction ID',
    example: 'PRJ-0714',
  },
  {
    key: 'snapshot_month',
    label: 'Snapshot Month',
    type: 'date',
    required: true,
    description: 'Observation period in YYYY-MM format',
    example: '2025-06',
  },
  {
    key: 'ministry',
    label: 'Nodal Ministry',
    type: 'string',
    required: true,
    description: 'Central or state nodal ministry / department',
    example: 'Ministry of Road Transport and Highways',
  },
  {
    key: 'sector',
    label: 'Infrastructure Sector',
    type: 'string',
    required: true,
    description: 'Sector domain (Roads, Railways, Power, Urban, etc.)',
    example: 'Road Transport and Highways',
  },
  {
    key: 'implementing_agency',
    label: 'Implementing Agency',
    type: 'string',
    required: true,
    description: 'Executing agency / PSU / Concessionaire',
    example: 'NHAI',
  },
  {
    key: 'state',
    label: 'State / UT',
    type: 'string',
    required: true,
    description: 'Geographic location / primary state',
    example: 'Maharashtra',
  },
  {
    key: 'original_cost_cr',
    label: 'Original Sanction Cost (₹ Cr)',
    type: 'number',
    required: true,
    description: 'Original approved capital sanction in ₹ Crores',
    example: 1250.0,
  },
  {
    key: 'planned_duration_months',
    label: 'Planned Duration (Months)',
    type: 'number',
    required: true,
    description: 'Approved contractual schedule in months',
    example: 36,
  },
  {
    key: 'elapsed_months',
    label: 'Elapsed Months',
    type: 'number',
    required: true,
    description: 'Months elapsed since project commencement',
    example: 18,
  },
  {
    key: 'physical_progress_pct',
    label: 'Physical Progress (%)',
    type: 'number',
    required: true,
    description: 'Cumulative physical progress percentage [0.0 - 100.0]',
    example: 45.5,
  },
  {
    key: 'financial_progress_pct',
    label: 'Financial Progress (%)',
    type: 'number',
    required: true,
    description: 'Cumulative financial expenditure utilization percentage [0.0 - 100.0]',
    example: 52.0,
  },
  {
    key: 'expenditure_cr',
    label: 'Cumulative Expenditure (₹ Cr)',
    type: 'number',
    required: true,
    description: 'Total expenditure incurred to date in ₹ Crores',
    example: 650.0,
  },
  {
    key: 'milestones_total',
    label: 'Total Milestones',
    type: 'number',
    required: true,
    description: 'Total tracked project milestones',
    example: 8,
  },
  {
    key: 'milestones_delayed',
    label: 'Delayed Milestones',
    type: 'number',
    required: true,
    description: 'Number of milestones currently behind schedule',
    example: 2,
  },
  {
    key: 'project_status',
    label: 'Project Status',
    type: 'string',
    required: true,
    description: 'Operational status (Ongoing, Delayed, Critical, etc.)',
    example: 'Ongoing',
  },
  {
    key: 'project_name',
    label: 'Project Name',
    type: 'string',
    required: false,
    description: 'Descriptive title of the infrastructure project',
    example: 'Delhi-Mumbai Expressway Package 4',
  },
]

export const FORBIDDEN_OUTCOME_FIELDS = [
  'cost_overrun',
  'time_overrun',
  'final_cost_cr',
  'actual_duration_months',
  'revised_cost_cr',
  'revised_duration_months',
]

export type MappingConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNMAPPED'

export interface FieldMapping {
  sourceField: string
  canonicalField: CanonicalFieldKey | null
  confidence: MappingConfidence
  matchReason: string
  sampleValues: any[]
}

export interface MappingSummary {
  totalSourceFields: number
  mappedRequiredCount: number
  totalRequiredCount: number
  unmappedSourceFields: string[]
  missingRequiredCanonical: CanonicalFieldKey[]
  mappings: FieldMapping[]
}

export interface CleaningTransformation {
  recordIndex: number
  projectId?: string
  field: string
  originalValue: any
  cleanedValue: any
  rule: string
}

export interface CleaningReport {
  rowsReceived: number
  rowsAccepted: number
  duplicatesCount: number
  invalidRowsCount: number
  missingValuesFilled: number
  transformations: CleaningTransformation[]
}

export interface ValidationErrorItem {
  recordIndex: number
  projectId?: string
  field: string
  value: any
  message: string
  isCritical: boolean
}

export interface ValidationWarningItem {
  recordIndex: number
  projectId?: string
  field: string
  value: any
  message: string
}

export interface ValidationReport {
  isValid: boolean
  predictionReady: boolean
  totalRecords: number
  validRecordCount: number
  invalidRecordCount: number
  errors: ValidationErrorItem[]
  warnings: ValidationWarningItem[]
  missingRequiredFields: CanonicalFieldKey[]
}

export type SupportedFormat = 'PDF' | 'CSV' | 'XLSX' | 'JSON' | 'TXT' | 'MD'

export interface RawExtractedRecord {
  recordIndex: number
  rawFields: Record<string, any>
  extractedTextPreview?: string
}

export interface ExtractionResult {
  format: SupportedFormat
  filename: string
  fileSizeBytes: number
  fileHash: string
  recordsDetected: number
  projectsDetected: number
  extractedRecords: RawExtractedRecord[]
  documentMetadata?: Record<string, any>
  parseWarnings: string[]
}

export interface ImportProvenance {
  sourceType: SupportedFormat
  sourceFilename: string
  sourceHash: string
  importedAt: string
  schemaVersion: string
  parserVersion: string
  modelVersion: string
}

export interface DataLabPredictionResult {
  recordIndex: number
  projectId: string
  projectName?: string
  costOverrunProbability: number
  costPrediction: number
  costRiskLevel: 'HIGH' | 'LOW'
  timeOverrunProbability: number
  timePrediction: number
  timeRiskLevel: 'HIGH' | 'LOW'
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  costDrivers: Array<{
    feature: string
    displayName: string
    value: any
    contribution: number
    direction: string
  }>
  timeDrivers: Array<{
    feature: string
    displayName: string
    value: any
    contribution: number
    direction: string
  }>
  earlyWarnings: Array<{
    warningType: string
    severity: string
    title: string
    message: string
  }>
}
