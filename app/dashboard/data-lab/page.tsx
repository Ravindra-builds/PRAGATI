'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Save,
  TrendingUp,
  Clock,
  Database,
  Sparkles,
  Sliders,
  Check,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Bot,
  FolderGit2,
  FileText,
  ShieldAlert,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import {
  CanonicalProjectRecord,
  CanonicalFieldKey,
  CANONICAL_FIELDS,
  SupportedFormat,
  ExtractionResult,
  MappingSummary,
  CleaningReport,
  ValidationReport,
  DataLabPredictionResult,
  ImportProvenance,
} from '@/lib/data-lab/types'

// Human-friendly parameter specification tailored for Government / Administrative officials (non-technical)
export interface OfficialFieldSpec {
  key: CanonicalFieldKey
  label: string
  category: 'Identification' | 'Administrative Oversight' | 'Financial Telemetry' | 'Timeline Telemetry' | 'Milestones & Execution'
  required: boolean
  requirementDesc: string
  whyNeeded: string
  example: string
  reportHeaders: string[]
}

export const OFFICIAL_FIELD_SPECS: OfficialFieldSpec[] = [
  {
    key: 'project_id',
    label: 'Project Code / ID',
    category: 'Identification',
    required: true,
    requirementDesc: 'Unique reference code (e.g. PRJ-101, NH-48)',
    whyNeeded: 'Uniquely anchors this asset across monthly monitoring snapshots without collisions.',
    example: 'PRJ-PUB-101',
    reportHeaders: ['Project Code', 'Project ID', 'Sanction ID', 'Code', 'Project Number'],
  },
  {
    key: 'project_name',
    label: 'Project Title / Name',
    category: 'Identification',
    required: false,
    requirementDesc: 'Official asset title or descriptive scheme name',
    whyNeeded: 'Identifies the project clearly on executive ministerial monitoring dashboards.',
    example: 'Mumbai-Goa Highway Widening Package 3',
    reportHeaders: ['Project Title', 'Project Name', 'Scheme Name', 'Name of Project'],
  },
  {
    key: 'ministry',
    label: 'Nodal Ministry',
    category: 'Administrative Oversight',
    required: true,
    requirementDesc: 'Union Ministry or Department name',
    whyNeeded: 'Assigns administrative accountability and inter-departmental governance.',
    example: 'Ministry of Road Transport and Highways',
    reportHeaders: ['Nodal Ministry', 'Ministry', 'Department', 'Central Ministry'],
  },
  {
    key: 'sector',
    label: 'Infrastructure Sector',
    category: 'Administrative Oversight',
    required: true,
    requirementDesc: 'Sector domain (e.g. Roads, Railways, Power, Urban Transport)',
    whyNeeded: 'Enables sector-specific risk baseline scoring in the ML prediction model.',
    example: 'Roads & Highways',
    reportHeaders: ['Sector', 'Infrastructure Sector', 'Domain', 'Category'],
  },
  {
    key: 'implementing_agency',
    label: 'Implementing Agency',
    category: 'Administrative Oversight',
    required: true,
    requirementDesc: 'Executing PSU or statutory authority (e.g. NHAI, RVNL, BMRCL)',
    whyNeeded: 'Evaluates institutional execution capacity and historical slippage patterns.',
    example: 'NHAI',
    reportHeaders: ['Executing Agency', 'Implementing Agency', 'Authority', 'PSU', 'Agency'],
  },
  {
    key: 'state',
    label: 'State / Location',
    category: 'Administrative Oversight',
    required: true,
    requirementDesc: 'State or Union Territory location',
    whyNeeded: 'Accounts for regional terrain, land acquisition factors, and monsoon weather windows.',
    example: 'Maharashtra',
    reportHeaders: ['State', 'State/UT', 'Location', 'Region'],
  },
  {
    key: 'original_cost_cr',
    label: 'Sanctioned Cost (₹ Cr)',
    category: 'Financial Telemetry',
    required: true,
    requirementDesc: 'Approved budget in ₹ Crores (₹/Cr/Lakhs auto-converted)',
    whyNeeded: 'Approved capital outlay baseline. Essential for calculating cost escalation risk.',
    example: '₹ 1,450.0 Cr',
    reportHeaders: ['Sanctioned Cost', 'Approved Cost', 'Original Cost (Cr)', 'Approved Budget'],
  },
  {
    key: 'planned_duration_months',
    label: 'Contractual Duration (Months)',
    category: 'Timeline Telemetry',
    required: true,
    requirementDesc: 'Approved contractual schedule in months',
    whyNeeded: 'Target completion baseline used by the Random Forest delay prediction model.',
    example: '36 months',
    reportHeaders: ['Duration (Months)', 'Planned Duration', 'Contractual Duration', 'Duration'],
  },
  {
    key: 'elapsed_months',
    label: 'Time Elapsed (Months)',
    category: 'Timeline Telemetry',
    required: true,
    requirementDesc: 'Months passed since project commencement',
    whyNeeded: 'Calculates the project timeline consumption velocity against approved milestones.',
    example: '24 months',
    reportHeaders: ['Time Elapsed', 'Elapsed Months', 'Months Since Commencement'],
  },
  {
    key: 'physical_progress_pct',
    label: 'Physical Progress (%)',
    category: 'Milestones & Execution',
    required: true,
    requirementDesc: 'Ground progress between 0% and 100% (e.g. 42.5%)',
    whyNeeded: 'Civil construction milestone completion verified on ground.',
    example: '42.5 %',
    reportHeaders: ['Physical Progress %', 'Physical %', 'Civil Progress', 'Work Done %'],
  },
  {
    key: 'financial_progress_pct',
    label: 'Financial Progress (%)',
    category: 'Financial Telemetry',
    required: true,
    requirementDesc: 'Fund expenditure pace between 0% and 100% (e.g. 58.0%)',
    whyNeeded: 'Disbursement progress. Paired with physical progress to detect premature fund burn.',
    example: '58.0 %',
    reportHeaders: ['Financial Progress %', 'Financial %', 'Expenditure %', 'Fund Utilization %'],
  },
  {
    key: 'expenditure_cr',
    label: 'Cumulative Spent (₹ Cr)',
    category: 'Financial Telemetry',
    required: true,
    requirementDesc: 'Total expenditure to date in ₹ Crores',
    whyNeeded: 'Measures funds disbursed against approved sanction to calculate financial burn gap.',
    example: '₹ 841.0 Cr',
    reportHeaders: ['Spent (Cr)', 'Expenditure (Cr)', 'Cumulative Spent', 'Actual Cost'],
  },
  {
    key: 'milestones_total',
    label: 'Total Milestones',
    category: 'Milestones & Execution',
    required: true,
    requirementDesc: 'Count of key project deliverables (e.g. 8)',
    whyNeeded: 'Denominator for milestone delay ratio used by the schedule prediction model.',
    example: '8',
    reportHeaders: ['Milestones Total', 'Total Milestones', 'Planned Deliverables'],
  },
  {
    key: 'milestones_delayed',
    label: 'Delayed Milestones',
    category: 'Milestones & Execution',
    required: true,
    requirementDesc: 'Milestones currently behind schedule',
    whyNeeded: 'Primary early indicator for critical path slippage and execution bottlenecks.',
    example: '3',
    reportHeaders: ['Delayed Milestones', 'Milestone Slippages', 'Delayed Deliverables'],
  },
  {
    key: 'project_status',
    label: 'Current Status',
    category: 'Administrative Oversight',
    required: true,
    requirementDesc: 'Ongoing, Delayed, Critical, or Completed',
    whyNeeded: 'Current operational classification recorded in official project reports.',
    example: 'Critical',
    reportHeaders: ['Current Status', 'Project Status', 'Execution Status'],
  },
  {
    key: 'snapshot_month',
    label: 'Observation Period',
    category: 'Administrative Oversight',
    required: false,
    requirementDesc: 'Reporting month in YYYY-MM (auto-defaults to current month if omitted)',
    whyNeeded: 'Anchors the monitoring period date for chronological telemetry tracking.',
    example: '2025-06',
    reportHeaders: ['Reporting Month', 'Observation Period', 'As On Date', 'Month'],
  },
]

// Pre-configured public infrastructure templates for 1-click evaluation
const SAMPLE_TEMPLATES = [
  {
    name: 'PAIMANA National Highway Report (CSV)',
    format: 'CSV',
    description: 'Multi-project highway telemetry with approved costs and milestone slippages',
    content: `Project Code,Sanctioned Cost (Cr),Duration (Months),Time Elapsed,Physical Progress %,Financial %,Spent (Cr),Milestones Total,Delayed Milestones,Nodal Ministry,Sector,Executing Agency,State,Current Status,Project Title
PRJ-PUB-101,1450.0,36,24,42.5,58.0,841.0,8,3,Ministry of Road Transport and Highways,Roads & Highways,NHAI,Maharashtra,Critical,Mumbai-Goa Highway Widening Package 3
PRJ-PUB-102,890.0,24,14,62.0,60.5,538.4,6,1,Ministry of Road Transport and Highways,Roads & Highways,NHAI,Gujarat,Ongoing,Ahmedabad Ring Road Expansion
PRJ-PUB-103,3200.0,48,44,78.0,91.5,2928.0,12,5,Ministry of Railways,Railways,RVNL,Odisha,Delayed,Bhubaneswar-Cuttack Quadrupling Line`,
    filename: 'paimana_highways_sample.csv',
  },
  {
    name: 'MoSPI Project Monitoring Snapshot (JSON)',
    format: 'JSON',
    description: 'Structured JSON telemetry matching MoSPI IPMD Common Upload Form',
    content: JSON.stringify(
      {
        reporting_period: '2025-06',
        source: 'MoSPI IPMD Public Report',
        projects: [
          {
            project_id: 'PRJ-MOSPI-882',
            project_name: 'Bengaluru Metro Phase 2A Outer Ring Road',
            ministry: 'Ministry of Housing and Urban Affairs',
            sector: 'Urban Transport',
            implementing_agency: 'BMRCL',
            state: 'Karnataka',
            original_cost: '₹ 2,450.00 Cr',
            planned_duration_months: 36,
            elapsed_months: 30,
            physical_progress: '51.5 %',
            financial_progress: '72.0 %',
            expenditure_cr: 1764.0,
            milestones_total: 10,
            milestones_delayed: 4,
            project_status: 'Critical',
          },
        ],
      },
      null,
      2
    ),
    filename: 'mospi_metro_sample.json',
  },
  {
    name: 'Infrastructure Inspection Dossier (Markdown)',
    format: 'MD',
    description: 'Key-value inspection report from state infrastructure audit',
    content: `# State Infrastructure Inspection Dossier
Project ID: PRJ-AUDIT-409
Project Name: Narmada River Aqueduct Canal Pipeline
Ministry: Ministry of Jal Shakti
Sector: Water Resources
Implementing Agency: State Water Board
State: Madhya Pradesh
Original Cost (₹ Cr): 780.0
Planned Duration (Months): 24
Elapsed Months: 18
Physical Progress (%): 55.0
Financial Progress (%): 68.0
Expenditure (₹ Cr): 530.4
Milestones Total: 6
Delayed Milestones: 2
Status: Ongoing
Observation Month: 2025-06`,
    filename: 'water_pipeline_dossier.md',
  },
]

export default function DataLabPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const extractionRef = useRef<HTMLDivElement>(null)
  const mappingSectionRef = useRef<HTMLDivElement>(null)
  const predictionResultsRef = useRef<HTMLDivElement>(null)
  const saveSectionRef = useRef<HTMLDivElement>(null)

  // Upload & Pipeline States
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [processingSubStep, setProcessingSubStep] = useState(1)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showSchemaGuide, setShowSchemaGuide] = useState(false)
  const [isMappingExpanded, setIsMappingExpanded] = useState(true)

  // Stage 1-6 State Objects
  const [currentStage, setCurrentStage] = useState<number>(1)
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [mappingSummary, setMappingSummary] = useState<MappingSummary | null>(null)
  const [customOverrides, setCustomOverrides] = useState<Record<string, CanonicalFieldKey>>({})
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [canonicalRecords, setCanonicalRecords] = useState<Partial<CanonicalProjectRecord>[]>([])
  const [predictions, setPredictions] = useState<DataLabPredictionResult[]>([])
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number>(0)

  // Drag & drop handlers
  const [isDragOver, setIsDragOver] = useState(false)

  // Sub-step timer animation during active background operations
  useEffect(() => {
    if (!isProcessing && !isPredicting && !isSaving) {
      return
    }
    const maxSteps = isProcessing ? 4 : 3
    const timer = setInterval(() => {
      setProcessingSubStep(prev => (prev < maxSteps ? prev + 1 : prev))
    }, 500)
    return () => {
      clearInterval(timer)
    }
  }, [isProcessing, isPredicting, isSaving])

  // Contextual Smooth Auto-Scrolling for Critical User Events
  // 1. Auto-scroll to error banner on processing or save failure
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // 2. Auto-scroll to extraction/alignment section when document is loaded
  useEffect(() => {
    if (extraction && predictions.length === 0) {
      const timer = setTimeout(() => {
        extractionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [extraction, predictions.length])

  // 3. Auto-scroll to ML Risk Scoring and SHAP explanations once predictions complete
  useEffect(() => {
    if (predictions.length > 0) {
      const timer = setTimeout(() => {
        predictionResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [predictions.length])

  // 4. Auto-scroll to database persistence card when save succeeds
  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => {
        saveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [isSaved])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile)
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setIsSaved(false)
    setIsMappingExpanded(true)
    processFile(selectedFile, {})
  }

  const handleLoadSample = (sample: typeof SAMPLE_TEMPLATES[0]) => {
    const blob = new Blob([sample.content], { type: 'text/plain' })
    const sampleFile = new File([blob], sample.filename, { type: 'text/plain' })
    setFile(sampleFile)
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setIsSaved(false)
    setIsMappingExpanded(true)
    processFile(sampleFile, {})
  }

  // Upload & Process Call
  const processFile = async (
    fileToProcess: File,
    overrides: Record<string, CanonicalFieldKey>
  ) => {
    setProcessingSubStep(1)
    setIsProcessing(true)
    setErrorMessage(null)
    setIsSaved(false)
    setCurrentStage(2)

    try {
      const formData = new FormData()
      formData.append('file', fileToProcess)
      if (Object.keys(overrides).length > 0) {
        formData.append('mappingOverrides', JSON.stringify(overrides))
      }

      const res = await fetch('/api/data-lab/parse', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to process file.')
      }

      setExtraction(data.extraction)
      setMappingSummary(data.mappingSummary)
      setCleaningReport(data.cleaningReport)
      setValidationReport(data.validationReport)
      setCanonicalRecords(data.canonicalRecords)
      setPredictions([])
      setSelectedProjectIndex(0)
      setCurrentStage(3)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during file parsing.'
      setErrorMessage(msg)
      setCurrentStage(1)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Mapping Override Change
  const handleMappingChange = (sourceField: string, canonicalField: string) => {
    setIsSaved(false)
    const newOverrides = {
      ...customOverrides,
      [sourceField]: canonicalField as CanonicalFieldKey,
    }
    setCustomOverrides(newOverrides)
    if (file) {
      processFile(file, newOverrides)
    }
  }

  // Run ML Prediction
  const handleRunPrediction = async () => {
    if (!validationReport?.predictionReady) return

    setProcessingSubStep(1)
    setIsPredicting(true)
    setErrorMessage(null)
    setIsSaved(false)

    try {
      const validRecords = canonicalRecords.filter(r => r.project_id && r.original_cost_cr)

      const res = await fetch('/api/data-lab/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validRecords }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'ML Prediction failed.')
      }

      setPredictions(data.predictions)
      setIsMappingExpanded(false) // Auto-minimize mapping matrix so government official immediately sees risk analysis!
      setCurrentStage(5)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while running ML predictions.'
      setErrorMessage(msg)
    } finally {
      setIsPredicting(false)
    }
  }

  // Save to PostgreSQL
  const handleSaveToDatabase = async () => {
    if (isSaved || isSaving || !predictions || predictions.length === 0) return

    setProcessingSubStep(1)
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const validRecords = canonicalRecords.filter(r => r.project_id && r.original_cost_cr)
      const provenance: ImportProvenance = {
        sourceType: (extraction?.format || 'CSV') as SupportedFormat,
        sourceFilename: extraction?.filename || 'uploaded_data',
        sourceHash: extraction?.fileHash || 'unknown_hash',
        importedAt: new Date().toISOString(),
        schemaVersion: '1.0.0',
        parserVersion: '1.0.0',
        modelVersion: 'v1.0-dual-target',
      }

      const res = await fetch('/api/data-lab/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: validRecords,
          predictions,
          provenance,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save dataset.')
      }

      setIsSaved(true)
      setSaveSuccessMessage(
        `Successfully persisted ${data.savedProjectsCount} project(s) and ${data.savedPredictionsCount} prediction(s) to PostgreSQL with public data provenance!`
      )
      setCurrentStage(6)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save imported records.'
      setErrorMessage(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // Full Reset / Back to Upload Screen
  const handleReset = () => {
    setFile(null)
    setExtraction(null)
    setMappingSummary(null)
    setCustomOverrides({})
    setCleaningReport(null)
    setValidationReport(null)
    setCanonicalRecords([])
    setPredictions([])
    setIsSaved(false)
    setIsMappingExpanded(true)
    setProcessingSubStep(1)
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    setCurrentStage(1)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const activePrediction = predictions[selectedProjectIndex]
  const activeRecord = canonicalRecords[selectedProjectIndex]

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              PRAGATI Data Lab
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              PUBLIC INGESTION GATEWAY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ingest public/official project reports, map schema fields, validate telemetry, and execute the existing dual-target ML inference pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* If file or sample loaded, show both Back and Reset buttons */}
          {(extraction || currentStage > 1) && (
            <>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Return to initial upload view"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Back to Upload</span>
              </button>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Clear current data and start fresh"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Reset / New File</span>
              </button>
            </>
          )}

          {/* Toggle Official Project Data Checklist (Government Guide) */}
          <button
            onClick={() => setShowSchemaGuide(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>{showSchemaGuide ? 'Hide Data Checklist' : 'Official Data Checklist'}</span>
            {showSchemaGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Connected Progress Stepper with Arrows & Live Animation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] gap-1.5">
          {[
            { step: 1, label: 'Upload File', desc: 'Select Dossier' },
            { step: 2, label: 'Extract Data', desc: 'Parse Fields' },
            { step: 3, label: 'Align Columns', desc: 'Parameter Match' },
            { step: 4, label: 'Quality Check', desc: 'Data Verification' },
            { step: 5, label: 'ML Risk Analysis', desc: 'Dual Models & SHAP' },
            { step: 6, label: 'Review & Save', desc: 'Persist to Database' },
          ].map((s, index, arr) => {
            const isCompleted = currentStage > s.step
            const isCurrent = currentStage === s.step
            const isClickable =
              (s.step === 1 && currentStage > 1) ||
              (s.step === 3 && !!extraction && currentStage > 3) ||
              (s.step === 4 && !!validationReport && currentStage > 4) ||
              (s.step === 5 && predictions.length > 0 && currentStage === 6)

            return (
              <React.Fragment key={s.step}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (s.step === 1) {
                      handleReset()
                    } else if (isClickable) {
                      setCurrentStage(s.step)
                    }
                  }}
                  className={`flex-1 p-2.5 rounded-xl border transition-all text-left relative ${
                    isClickable
                      ? 'cursor-pointer hover:border-blue-400 hover:shadow-2xs'
                      : 'cursor-default'
                  } ${
                    isCurrent
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400'
                  }`}
                >
                  {/* Pulsing live activity beacon on current stage */}
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full text-[10.5px] font-bold flex items-center justify-center shrink-0 transition-transform ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-700 text-white scale-105 ring-2 ring-blue-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold leading-tight truncate ${
                          isCurrent
                            ? 'text-blue-900 font-extrabold'
                            : isCompleted
                            ? 'text-emerald-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                </button>

                {/* Connecting Arrow between stages */}
                {index < arr.length - 1 && (
                  <div className="flex items-center justify-center px-0.5 text-slate-300 shrink-0">
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-colors ${
                        isCompleted
                          ? 'text-emerald-500'
                          : isCurrent
                          ? 'text-blue-500 animate-pulse'
                          : 'text-slate-300'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Official Project Data Checklist (Plain language for Government Officials) */}
      {showSchemaGuide && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  PRAGATI Project Monitoring Parameter Checklist
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                The PRAGATI risk evaluation engine relies on 15 core parameters found in standard MoSPI and PAIMANA reports. Below is a plain-language guide on what each parameter means and why it matters:
              </p>
            </div>
            <button
              onClick={() => setShowSchemaGuide(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {OFFICIAL_FIELD_SPECS.map(spec => (
              <div
                key={spec.key}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {spec.label}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                      spec.required
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {spec.required ? 'REQUIRED' : 'OPTIONAL'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug">
                  <span className="font-semibold text-slate-800">Why Needed: </span>
                  {spec.whyNeeded}
                </p>

                <div className="pt-1 border-t border-slate-200/60 text-[10.5px] space-y-1">
                  <div className="text-slate-700">
                    <span className="font-medium text-slate-500">Expected Format: </span>
                    {spec.requirementDesc}
                  </div>
                  <div className="text-slate-500 truncate">
                    <span className="font-medium text-slate-500">Report Headers: </span>
                    {spec.reportHeaders.slice(0, 3).join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error / Processing Notice */}
      {errorMessage && (
        <div ref={errorRef} className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-2xs">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-rose-900">Upload Notice</p>
            <p className="text-rose-800">{errorMessage}</p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => setShowSchemaGuide(true)}
                className="underline font-semibold text-rose-900 hover:text-rose-950 cursor-pointer"
              >
                View Expected Parameters Guide &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Success Banner */}
      {saveSuccessMessage && (
        <div ref={successRef} className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Dataset Persisted Successfully</p>
            <p className="mt-0.5 text-emerald-800">{saveSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* STAGE 1: UPLOAD ZONE (Rendered when no extraction is active) */}
      {!extraction && (
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-white ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
                <Upload className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Upload Project Dossier or Dataset
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Drag and drop your public infrastructure report or browse from your computer.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0])
                  }
                }}
                accept=".pdf,.csv,.xlsx,.xls,.json,.txt,.md,.markdown"
                className="hidden"
              />

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Browse Files
                </button>
              </div>

              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Supported Formats:</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {['PDF (Dossier)', 'CSV (Table)', 'XLSX (Excel)', 'JSON (MoSPI CUF)', 'TXT / MD (Inspection)'].map(
                    fmt => (
                      <span
                        key={fmt}
                        className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-medium"
                      >
                        {fmt}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Evaluator Templates */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                1-Click Sample Public Datasets for Evaluation
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Instantly test the extraction, mapping, and ML prediction pipeline using pre-structured public infrastructure datasets:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {SAMPLE_TEMPLATES.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLoadSample(sample)}
                  className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {sample.format}
                    </span>
                    <span className="text-[10px] text-blue-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Load <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {sample.name}
                  </h4>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
                    {sample.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAGES 2 - 6: EXTRACTION, MAPPING, VALIDATION & ML PREDICTION */}
      {extraction && (
        <div ref={extractionRef} className="space-y-6">
          {/* File Overview Card with Quick Reset Action */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{extraction.filename}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {extraction.format}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span>Size: {(extraction.fileSizeBytes / 1024).toFixed(1)} KB</span>
                  <span>&bull;</span>
                  <span>{extraction.recordsDetected} Record(s) Detected</span>
                  <span>&bull;</span>
                  <span>{extraction.projectsDetected} Project(s)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Upload a different report or dossier"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Different File</span>
              </button>
            </div>
          </div>

          {/* Quality & Validation Summary Strip */}
          {cleaningReport && validationReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Rows Ingested</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  {cleaningReport.rowsReceived}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Verified Rows</p>
                <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                  {validationReport.validRecordCount}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Currency & Date Cleaned</p>
                <p className="text-lg font-bold text-blue-700 font-mono mt-0.5">
                  {cleaningReport.transformations.length}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">ML Model Readiness</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {validationReport.predictionReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> Ready for Risk Scoring
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missing Parameters
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Administrative Validation Advisory (Human-Friendly) */}
          {validationReport && (!validationReport.predictionReady || validationReport.errors.length > 0) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Official Parameter Notice: Clarification Required Before Risk Scoring
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    PRAGATI ML models require complete baseline numbers to evaluate project overrun risks. Please check the items below:
                  </p>
                </div>
              </div>

              {/* Missing Required Fields Section */}
              {validationReport.missingRequiredFields.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Required Parameters to Align ({validationReport.missingRequiredFields.length}):
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {validationReport.missingRequiredFields.map(missingKey => {
                      const spec = OFFICIAL_FIELD_SPECS.find(s => s.key === missingKey)
                      return (
                        <div
                          key={missingKey}
                          className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {spec?.label || missingKey}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              REQUIRED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            {spec?.whyNeeded || 'Essential for the machine learning models.'}
                          </p>
                          <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Common Column Names: </span>
                            <span className="font-medium text-slate-700">
                              {spec?.reportHeaders.slice(0, 3).join(', ') || 'N/A'}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-blue-700 pt-0.5">
                            Action: Select the matching column from your file using the dropdown in the Alignment Table below.
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Row-Level Value Discrepancies */}
              {validationReport.errors.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Value Format Clarifications ({validationReport.errors.length}):
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {validationReport.errors.slice(0, 8).map((err, idx) => {
                      const spec = OFFICIAL_FIELD_SPECS.find(s => s.key === err.field)
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-rose-200 text-xs flex items-start gap-3 shadow-2xs"
                        >
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">
                                Project {err.projectId || `Row ${err.recordIndex + 1}`} &bull;{' '}
                                <span className="text-rose-700">{spec?.label || err.field}</span>
                              </span>
                              <span className="text-[10px] font-medium text-slate-500">
                                Value Found: &quot;{String(err.value)}&quot;
                              </span>
                            </div>
                            <p className="text-[11.5px] text-rose-800 font-medium">{err.message}</p>
                            <p className="text-[10.5px] text-slate-600">
                              <span className="font-semibold">Requirement: </span>
                              {spec?.requirementDesc || 'Standard numerical format.'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Minimizable Column Alignment Section (Polished for Government Users) */}
          {mappingSummary && (
            <div ref={mappingSectionRef} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* If minimized: compact summary header */}
              {!isMappingExpanded ? (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          Project Parameters Aligned
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {mappingSummary.mappedRequiredCount} / {mappingSummary.totalRequiredCount} Parameters Matched
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Source report columns successfully matched to PRAGATI monitoring metrics.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMappingExpanded(true)
                        setTimeout(() => {
                          mappingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 60)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-600" />
                      <span>Review / Edit Column Mappings</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-blue-700" />
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          Project Parameter Alignment Matrix
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Matched {mappingSummary.mappedRequiredCount} of {mappingSummary.totalRequiredCount} core monitoring parameters. Adjust mappings below if required:
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMappingExpanded(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Minimize Alignment View</span>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-4">Column in Your Report</th>
                          <th className="py-2.5 px-4">Sample Values</th>
                          <th className="py-2.5 px-4">PRAGATI Monitoring Metric</th>
                          <th className="py-2.5 px-4">System Match</th>
                          <th className="py-2.5 px-4">Alignment Basis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mappingSummary.mappings.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-4 font-semibold text-slate-900">
                              {m.sourceField}
                            </td>
                            <td className="py-2 px-4 text-slate-500 font-mono text-[11px] max-w-[200px] truncate">
                              {m.sampleValues.map(v => String(v)).join(', ') || '—'}
                            </td>
                            <td className="py-2 px-4">
                              <select
                                value={customOverrides[m.sourceField] || m.canonicalField || ''}
                                onChange={e => handleMappingChange(m.sourceField, e.target.value)}
                                className="w-full text-xs font-medium rounded-lg border border-slate-300 py-1 px-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="">-- Ignore / Not Monitored --</option>
                                {CANONICAL_FIELDS.map(cf => (
                                  <option key={cf.key} value={cf.key}>
                                    {cf.label} {cf.required ? '*' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  m.confidence === 'HIGH'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : m.confidence === 'MEDIUM'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {m.confidence === 'HIGH' ? 'Exact Match' : m.confidence === 'MEDIUM' ? 'Likely Match' : 'Unmatched'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-[11px] text-slate-500">
                              {m.matchReason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to File Upload
                    </button>

                    {validationReport?.predictionReady && predictions.length === 0 && (
                      <button
                        onClick={handleRunPrediction}
                        disabled={isPredicting}
                        className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Execute ML Risk Scoring ({validationReport.validRecordCount} Project{validationReport.validRecordCount > 1 ? 's' : ''})
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Trigger for ML Prediction */}
          {validationReport?.predictionReady && predictions.length === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Validation Passed &bull; Ready for Dual-Target ML Inference
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Run the existing Cost Overrun (Logistic/Gradient-Boosted) and Schedule Delay (Random Forest) models with SHAP explainability.
                </p>
              </div>

              <button
                onClick={handleRunPrediction}
                disabled={isPredicting}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 inline-flex items-center gap-2"
              >
                {isPredicting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Risk Scoring...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Execute ML Risk Scoring ({validationReport.validRecordCount} Project{validationReport.validRecordCount > 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          )}

          {/* STAGE 5 & 6: ML PREDICTION & SHAP RESULTS */}
          {predictions.length > 0 && activePrediction && activeRecord && (
            <div ref={predictionResultsRef} className="space-y-6">
              {/* Navigation strip between results and mapping */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStage(3)
                    setIsMappingExpanded(true)
                    setTimeout(() => {
                      mappingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 60)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Review / Modify Column Alignment
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Import Another Dataset
                </button>
              </div>

              {/* Multi-Project Selector if > 1 project */}
              {predictions.length > 1 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                  <p className="text-xs font-bold text-slate-900 mb-2">
                    Select Monitored Project to Inspect ({predictions.length} detected):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {predictions.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedProjectIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedProjectIndex === idx
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{p.projectId}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.overallRiskLevel === 'HIGH'
                              ? 'bg-rose-400'
                              : p.overallRiskLevel === 'MEDIUM'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Title & Risk Overview Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {activePrediction.projectId}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {activePrediction.projectName || activePrediction.projectId}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeRecord.ministry} &bull; {activeRecord.sector} &bull; {activeRecord.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Overall Composite Risk:</span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activePrediction.overallRiskLevel === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : activePrediction.overallRiskLevel === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {activePrediction.overallRiskLevel} RISK
                    </span>
                  </div>
                </div>

                {/* Dual Target Probability Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cost Overrun Card */}
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-900">Cost Overrun Risk</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                        {activePrediction.costRiskLevel}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono">
                        {(activePrediction.costOverrunProbability * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Probability</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${activePrediction.costOverrunProbability * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Schedule Delay Card */}
                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-900">Schedule Delay Risk</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        {activePrediction.timeRiskLevel}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
                        {(activePrediction.timeOverrunProbability * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Probability</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${activePrediction.timeOverrunProbability * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* SHAP Model-Supported Root Cause Drivers */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-700" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Why is this project scored this way? (SHAP Feature Attribution)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cost Drivers */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700">Cost Overrun Drivers</p>
                      {activePrediction.costDrivers.length > 0 ? (
                        <div className="space-y-1.5">
                          {activePrediction.costDrivers.slice(0, 4).map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium truncate max-w-[180px]">
                                {d.displayName || d.feature}
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  d.direction === 'increases_risk'
                                    ? 'text-rose-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {d.direction === 'increases_risk' ? '+' : '-'}
                                {(Math.abs(d.contribution) * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">Normal telemetry profile</p>
                      )}
                    </div>

                    {/* Schedule Drivers */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700">Schedule Delay Drivers</p>
                      {activePrediction.timeDrivers.length > 0 ? (
                        <div className="space-y-1.5">
                          {activePrediction.timeDrivers.slice(0, 4).map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium truncate max-w-[180px]">
                                {d.displayName || d.feature}
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  d.direction === 'increases_risk'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {d.direction === 'increases_risk' ? '+' : '-'}
                                {(Math.abs(d.contribution) * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">Normal schedule indicators</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Triggered Early Warnings */}
                {activePrediction.earlyWarnings.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700">
                      Triggered Early Warning Alerts ({activePrediction.earlyWarnings.length}):
                    </p>
                    <div className="space-y-1.5">
                      {activePrediction.earlyWarnings.map((w, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs flex items-start gap-2"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900">{w.title}</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">{w.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Dataset to PRAGATI Action Card with state change protection */}
              <div ref={saveSectionRef} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className={`w-4 h-4 ${isSaved ? 'text-emerald-600' : 'text-slate-700'}`} />
                      <h3 className="text-sm font-bold text-slate-900">
                        {isSaved
                          ? 'Dataset Persisted in PRAGATI Database'
                          : 'Persist Verified Public Dataset to PRAGATI'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {isSaved
                        ? `All ${predictions.length} project(s) are stored in PostgreSQL with public provenance (isSynthetic: false) and available across PRAGATI.`
                        : `Saves all ${predictions.length} project(s), monitoring snapshots, predictions, and alerts into PostgreSQL with public data provenance tags (isSynthetic: false).`}
                    </p>
                  </div>

                  {isSaved ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Dataset Persisted to Database</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleSaveToDatabase}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 inline-flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving to Database...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save to PRAGATI Database
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Once saved, show immediate next step actions for rich UX */}
                {isSaved && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Next Actions & Live Exploration:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Link
                        href="/dashboard/projects"
                        className="p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderGit2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Projects Directory</p>
                            <p className="text-[10.5px] text-emerald-700/80">View imported telemetry</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </Link>

                      <Link
                        href="/dashboard/assistant"
                        className="p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 text-blue-900 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bot className="w-4 h-4 text-blue-700 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">PRAGATI AI Assistant</p>
                            <p className="text-[10.5px] text-blue-700/80">Query risk drivers with LLM</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </Link>

                      <button
                        onClick={handleReset}
                        className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all flex items-center justify-between group cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <RefreshCw className="w-4 h-4 text-slate-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Import Another Dataset</p>
                            <p className="text-[10.5px] text-slate-500">Upload new dossier or report</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIVE PROCESSING STEPPER OVERLAY */}
      {(isProcessing || isPredicting || isSaving) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isProcessing && 'Ingesting & Analyzing Document Telemetry'}
                  {isPredicting && 'Executing Dual-Target ML Prediction Pipeline'}
                  {isSaving && 'Persisting Dataset to PRAGATI Database'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isProcessing && 'Extracting tabular records, aligning schema aliases, and sanitizing fields...'}
                  {isPredicting && 'Generating features and querying FastAPI Cost & Delay ML models...'}
                  {isSaving && 'Writing verified records and SHAP telemetry to PostgreSQL...'}
                </p>
              </div>
            </div>

            {/* Dynamic Sub-Step List */}
            <div className="space-y-2.5 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {isProcessing && (
                <>
                  <ProcessingStepItem
                    number={1}
                    title="File Type Ingestion & Parsing"
                    description="Extracting raw tokens and tabular structure from uploaded file"
                    isActive={processingSubStep === 1}
                    isDone={processingSubStep > 1}
                  />
                  <ProcessingStepItem
                    number={2}
                    title="Parameter Schema Alignment"
                    description="Matching column aliases against recognized PAIMANA & MoSPI headers"
                    isActive={processingSubStep === 2}
                    isDone={processingSubStep > 2}
                  />
                  <ProcessingStepItem
                    number={3}
                    title="Data Sanitization & Currency Normalization"
                    description="Standardizing currency amounts (₹, Cr, Lakhs), progress percentages, and dates"
                    isActive={processingSubStep === 3}
                    isDone={processingSubStep > 3}
                  />
                  <ProcessingStepItem
                    number={4}
                    title="Domain Validation & Quality Check"
                    description="Verifying complete baseline parameters and isolating outcome variables"
                    isActive={processingSubStep >= 4}
                    isDone={false}
                  />
                </>
              )}

              {isPredicting && (
                <>
                  <ProcessingStepItem
                    number={1}
                    title="Feature Matrix Assembly"
                    description="Synthesizing ratios (cost elapsed, delay ratio) and category encodings"
                    isActive={processingSubStep === 1}
                    isDone={processingSubStep > 1}
                  />
                  <ProcessingStepItem
                    number={2}
                    title="Dual-Target ML Pipeline Invocation"
                    description="Cost Overrun (Logistic/Gradient-Boosted) + Schedule Delay (Random Forest)"
                    isActive={processingSubStep === 2}
                    isDone={processingSubStep > 2}
                  />
                  <ProcessingStepItem
                    number={3}
                    title="TreeExplainer SHAP Root Cause Attribution"
                    description="Computing local Shapley values for positive and negative risk drivers"
                    isActive={processingSubStep >= 3}
                    isDone={false}
                  />
                </>
              )}

              {isSaving && (
                <>
                  <ProcessingStepItem
                    number={1}
                    title="Attaching Public Data Provenance"
                    description="Configuring checksum hash, parser version, and isSynthetic: false flags"
                    isActive={processingSubStep === 1}
                    isDone={processingSubStep > 1}
                  />
                  <ProcessingStepItem
                    number={2}
                    title="PostgreSQL Atomic Transaction"
                    description="Inserting project records, snapshot metrics, and early warning alerts"
                    isActive={processingSubStep === 2}
                    isDone={processingSubStep > 2}
                  />
                  <ProcessingStepItem
                    number={3}
                    title="Syncing Monitoring Telemetry"
                    description="Refreshes project directory and AI query knowledge base"
                    isActive={processingSubStep >= 3}
                    isDone={false}
                  />
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="font-medium">Please wait while the pipeline executes...</span>
              <span className="font-mono font-semibold text-blue-700">
                Step {processingSubStep} of {isProcessing ? 4 : 3}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProcessingStepItem({
  number,
  title,
  description,
  isActive,
  isDone,
}: {
  number: number
  title: string
  description: string
  isActive: boolean
  isDone: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-blue-50/80 border border-blue-200'
          : isDone
          ? 'bg-emerald-50/50 border border-emerald-200'
          : 'opacity-50'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
          isDone
            ? 'bg-emerald-600 text-white'
            : isActive
            ? 'bg-blue-700 text-white animate-pulse'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        {isDone ? <Check className="w-3 h-3" /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-bold leading-tight ${
            isDone ? 'text-emerald-900' : isActive ? 'text-blue-900' : 'text-slate-700'
          }`}
        >
          {title}
        </p>
        <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      {isActive && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0 mt-1" />}
      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-1" />}
    </div>
  )
}
