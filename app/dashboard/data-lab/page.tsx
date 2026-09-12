'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Save,
  ShieldCheck,
  TrendingUp,
  Clock,
  Layers,
  Database,
  Search,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  Sliders,
  Check,
  Zap,
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

// Sample pre-configured public templates for 1-click evaluator testing
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

  // Upload & Pipeline States
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    processFile(selectedFile, {})
  }

  const handleLoadSample = (sample: typeof SAMPLE_TEMPLATES[0]) => {
    const blob = new Blob([sample.content], { type: 'text/plain' })
    const sampleFile = new File([blob], sample.filename, { type: 'text/plain' })
    setFile(sampleFile)
    setErrorMessage(null)
    setSaveSuccessMessage(null)
    processFile(sampleFile, {})
  }

  // Upload & Process Call
  const processFile = async (
    fileToProcess: File,
    overrides: Record<string, CanonicalFieldKey>
  ) => {
    setIsProcessing(true)
    setErrorMessage(null)
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
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during file parsing.')
      setCurrentStage(1)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Mapping Override Change
  const handleMappingChange = (sourceField: string, canonicalField: string) => {
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

    setIsPredicting(true)
    setErrorMessage(null)

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
      setCurrentStage(5)
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while running ML predictions.')
    } finally {
      setIsPredicting(false)
    }
  }

  // Save to PostgreSQL
  const handleSaveToDatabase = async () => {
    if (!predictions || predictions.length === 0) return

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

      setSaveSuccessMessage(
        `Successfully persisted ${data.savedProjectsCount} project(s) and ${data.savedPredictionsCount} prediction(s) to PostgreSQL with public data provenance!`
      )
      setCurrentStage(6)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save imported records.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setExtraction(null)
    setMappingSummary(null)
    setCustomOverrides({})
    setCleaningReport(null)
    setValidationReport(null)
    setCanonicalRecords([])
    setPredictions([])
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
    <div className="space-y-6 pb-16">
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

        {file && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset / Upload New File
          </button>
        )}
      </div>

      {/* Progress Stepper Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
        <div className="grid grid-cols-6 gap-1 sm:gap-2">
          {[
            { step: 1, label: 'Upload', desc: 'Select File' },
            { step: 2, label: 'Extract', desc: 'Parse Records' },
            { step: 3, label: 'Map Fields', desc: 'Schema Match' },
            { step: 4, label: 'Validate', desc: 'Clean & Check' },
            { step: 5, label: 'Predict', desc: 'Run ML Engine' },
            { step: 6, label: 'Explain & Save', desc: 'SHAP & DB' },
          ].map(s => {
            const isCompleted = currentStage > s.step
            const isCurrent = currentStage === s.step
            return (
              <div
                key={s.step}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/20'
                    : isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50/40 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        isCurrent ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {s.step}
                    </span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                <p className="text-[9.5px] text-slate-500 hidden md:block mt-0.5 truncate">{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Processing Notice</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Dataset Persisted Successfully</p>
            <p className="mt-0.5 text-emerald-800">{saveSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* STAGE 1: UPLOAD ZONE */}
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
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Parsing Document...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Browse Files
                    </>
                  )}
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

      {/* STAGE 2 & 3: EXTRACTION & MAPPING MATRIX */}
      {extraction && (
        <div className="space-y-6">
          {/* File Overview Card */}
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
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={extraction.fileHash}>
                SHA: {extraction.fileHash.slice(0, 12)}...
              </span>
            </div>
          </div>

          {/* Cleaning & Validation Summary Strip */}
          {cleaningReport && validationReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Rows Received</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  {cleaningReport.rowsReceived}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Valid Rows</p>
                <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                  {validationReport.validRecordCount}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Transformations Applied</p>
                <p className="text-lg font-bold text-blue-700 font-mono mt-0.5">
                  {cleaningReport.transformations.length}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <p className="text-[10.5px] font-medium text-slate-500">Prediction Readiness</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {validationReport.predictionReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> Ready for ML
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mapping Table Matrix */}
          {mappingSummary && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Deterministic Field Mapping Matrix
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mapped {mappingSummary.mappedRequiredCount} of {mappingSummary.totalRequiredCount} required canonical fields. You can manually adjust mappings below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600">
                    Source Fields: {mappingSummary.totalSourceFields}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Source Header</th>
                      <th className="py-2.5 px-4">Sample Values</th>
                      <th className="py-2.5 px-4">PRAGATI Canonical Field</th>
                      <th className="py-2.5 px-4">Confidence</th>
                      <th className="py-2.5 px-4">Match Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappingSummary.mappings.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-4 font-mono font-medium text-slate-800">
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
                            <option value="">-- Unmapped / Ignore --</option>
                            {CANONICAL_FIELDS.map(cf => (
                              <option key={cf.key} value={cf.key}>
                                {cf.label} ({cf.key}) {cf.required ? '*' : ''}
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
                            {m.confidence}
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
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Inference...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Execute ML Predictions ({validationReport.validRecordCount} Project{validationReport.validRecordCount > 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          )}

          {/* STAGE 5 & 6: ML PREDICTION & SHAP RESULTS */}
          {predictions.length > 0 && activePrediction && activeRecord && (
            <div className="space-y-6">
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

              {/* Save Dataset to PRAGATI Action Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Persist Verified Public Dataset to PRAGATI
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Saves all {predictions.length} project(s), monitoring snapshots, predictions, and alerts into PostgreSQL with public data provenance tags (<span className="font-mono text-slate-700">isSynthetic: false</span>).
                  </p>
                </div>

                <button
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 inline-flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to PRAGATI Database
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
