/**
 * PRAGATI Data Lab Service.
 *
 * Coordinates parsing, mapping, cleaning, validation, ML prediction execution,
 * and optional database persistence for uploaded project data.
 * Reuses the existing ML client, risk engine, and early warning logic.
 */

import { mlClient } from '@/lib/ml-client'
import { calculateOverallRisk, evaluateEarlyWarnings } from '@/lib/risk-engine'
import { prisma } from '@/lib/db'
import {
  CanonicalProjectRecord,
  CanonicalFieldKey,
  ExtractionResult,
  MappingSummary,
  CleaningReport,
  CleaningTransformation,
  ValidationReport,
  DataLabPredictionResult,
  ImportProvenance,
} from './types'
import { extractUploadedFile } from './extractors'
import { buildMappingSummary } from './mapping'
import { cleanAndNormalizeRecord } from './cleaner'
import { validateCanonicalRecords } from './validator'

export class DataLabService {
  /**
   * Stage 1 & 2: Parses uploaded file and computes initial mapping, cleaning, and validation.
   */
  async processUpload(
    buffer: Buffer,
    filename: string,
    customMappingOverrides?: Record<string, CanonicalFieldKey>
  ): Promise<{
    extraction: ExtractionResult
    mappingSummary: MappingSummary
    cleaningReport: CleaningReport
    validationReport: ValidationReport
    canonicalRecords: Partial<CanonicalProjectRecord>[]
  }> {
    // 1. Extract raw records
    const extraction = await extractUploadedFile(buffer, filename)

    if (extraction.extractedRecords.length === 0) {
      return {
        extraction,
        mappingSummary: {
          totalSourceFields: 0,
          mappedRequiredCount: 0,
          totalRequiredCount: 15,
          unmappedSourceFields: [],
          missingRequiredCanonical: [],
          mappings: [],
        },
        cleaningReport: {
          rowsReceived: 0,
          rowsAccepted: 0,
          duplicatesCount: 0,
          invalidRowsCount: 0,
          missingValuesFilled: 0,
          transformations: [],
        },
        validationReport: {
          isValid: false,
          predictionReady: false,
          totalRecords: 0,
          validRecordCount: 0,
          invalidRecordCount: 0,
          errors: [{ recordIndex: 0, field: 'file', value: '', message: 'No records extracted from file.', isCritical: true }],
          warnings: [],
          missingRequiredFields: [],
        },
        canonicalRecords: [],
      }
    }

    // 2. Build deterministic mapping summary
    const rawList = extraction.extractedRecords.map(r => r.rawFields)
    const mappingSummary = buildMappingSummary(rawList)

    // Build active mapping dictionary with overrides
    const activeMapping: Record<string, CanonicalFieldKey> = {}
    mappingSummary.mappings.forEach(m => {
      if (m.canonicalField) {
        activeMapping[m.sourceField] = m.canonicalField
      }
    })

    if (customMappingOverrides) {
      Object.entries(customMappingOverrides).forEach(([src, canon]) => {
        if (canon) {
          activeMapping[src] = canon
        } else {
          delete activeMapping[src]
        }
      })
    }

    // 3. Clean and normalize records
    const transformations: CleaningTransformation[] = []
    const canonicalRecords: Partial<CanonicalProjectRecord>[] = []
    const seenProjectKeys = new Set<string>()
    let duplicatesCount = 0

    extraction.extractedRecords.forEach((rec, idx) => {
      const canonical = cleanAndNormalizeRecord(rec.rawFields, activeMapping, idx, transformations)

      // Duplicate detection by projectId + snapshotMonth
      const key = `${canonical.project_id || idx}_${canonical.snapshot_month || 'current'}`
      if (seenProjectKeys.has(key)) {
        duplicatesCount++
      } else {
        seenProjectKeys.add(key)
      }

      canonicalRecords.push(canonical)
    })

    // 4. Validate canonical records
    const validationReport = validateCanonicalRecords(canonicalRecords)

    const cleaningReport: CleaningReport = {
      rowsReceived: extraction.recordsDetected,
      rowsAccepted: validationReport.validRecordCount,
      duplicatesCount,
      invalidRowsCount: validationReport.invalidRecordCount,
      missingValuesFilled: transformations.filter(t => t.rule.includes('Defaulted')).length,
      transformations,
    }

    return {
      extraction,
      mappingSummary,
      cleaningReport,
      validationReport,
      canonicalRecords,
    }
  }

  /**
   * Stage 5: Executes ML prediction pipeline on validated canonical records using existing ML service.
   */
  async predictBatch(
    records: CanonicalProjectRecord[]
  ): Promise<DataLabPredictionResult[]> {
    const results: DataLabPredictionResult[] = []

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]

      try {
        // Enforce exact types for ML service payload
        const mlInput = {
          project_id: rec.project_id,
          snapshot_month: rec.snapshot_month,
          ministry: rec.ministry,
          sector: rec.sector,
          implementing_agency: rec.implementing_agency,
          state: rec.state,
          original_cost_cr: Number(rec.original_cost_cr),
          planned_duration_months: Math.max(1, Math.round(rec.planned_duration_months)),
          elapsed_months: Math.min(
            Math.max(1, Math.round(rec.elapsed_months)),
            Math.max(1, Math.round(rec.planned_duration_months))
          ),
          physical_progress_pct: Number(rec.physical_progress_pct),
          financial_progress_pct: Number(rec.financial_progress_pct),
          expenditure_cr: Number(rec.expenditure_cr),
          milestones_total: Math.max(1, Math.round(rec.milestones_total)),
          milestones_delayed: Math.min(
            Math.max(0, Math.round(rec.milestones_delayed)),
            Math.max(1, Math.round(rec.milestones_total))
          ),
          project_status: rec.project_status || 'Ongoing',
        }

        // Call EXISTING trained ML pipeline via mlClient
        const mlResponse = await mlClient.predictOverrun(mlInput)

        // Compute overall risk tier using existing business engine
        const overallRisk = calculateOverallRisk(
          mlResponse.cost_overrun.probability,
          mlResponse.time_overrun.probability,
          mlResponse.cost_overrun.prediction,
          mlResponse.time_overrun.prediction
        )

        // Generate early warnings using existing rules
        const earlyWarnings = evaluateEarlyWarnings(
          {
            projectId: rec.project_id,
            originalCostCr: rec.original_cost_cr,
            plannedDurationMonths: rec.planned_duration_months,
          },
          {
            elapsedMonths: rec.elapsed_months,
            physicalProgressPct: rec.physical_progress_pct,
            financialProgressPct: rec.financial_progress_pct,
            milestonesTotal: rec.milestones_total,
            milestonesDelayed: rec.milestones_delayed,
            projectStatus: rec.project_status,
          },
          {
            costOverrunProbability: mlResponse.cost_overrun.probability,
            costPrediction: mlResponse.cost_overrun.prediction,
            timeOverrunProbability: mlResponse.time_overrun.probability,
            timePrediction: mlResponse.time_overrun.prediction,
          }
        )

        results.push({
          recordIndex: i,
          projectId: rec.project_id,
          projectName: rec.project_name || rec.project_id,
          costOverrunProbability: mlResponse.cost_overrun.probability,
          costPrediction: mlResponse.cost_overrun.prediction,
          costRiskLevel: mlResponse.cost_overrun.risk_level as 'HIGH' | 'LOW',
          timeOverrunProbability: mlResponse.time_overrun.probability,
          timePrediction: mlResponse.time_overrun.prediction,
          timeRiskLevel: mlResponse.time_overrun.risk_level as 'HIGH' | 'LOW',
          overallRiskLevel: overallRisk,
          costDrivers: (mlResponse.cost_overrun.drivers || []).map(d => ({
            feature: d.feature,
            displayName: d.display_name,
            value: d.value,
            contribution: d.contribution,
            direction: d.direction,
          })),
          timeDrivers: (mlResponse.time_overrun.drivers || []).map(d => ({
            feature: d.feature,
            displayName: d.display_name,
            value: d.value,
            contribution: d.contribution,
            direction: d.direction,
          })),
          earlyWarnings: earlyWarnings.map(w => ({
            warningType: w.warningType,
            severity: w.severity,
            title: w.title,
            message: w.message,
          })),
        })
      } catch (err: any) {
        // Safe fallback if ML inference encounters unexpected error
        results.push({
          recordIndex: i,
          projectId: rec.project_id,
          projectName: rec.project_name || rec.project_id,
          costOverrunProbability: 0.5,
          costPrediction: 0,
          costRiskLevel: 'LOW',
          timeOverrunProbability: 0.5,
          timePrediction: 0,
          timeRiskLevel: 'LOW',
          overallRiskLevel: 'LOW',
          costDrivers: [],
          timeDrivers: [],
          earlyWarnings: [
            {
              warningType: 'ML_INFERENCE_WARNING',
              severity: 'LOW',
              title: 'Inference Fallback',
              message: `Prediction evaluated with standard fallback: ${err.message}`,
            },
          ],
        })
      }
    }

    return results
  }

  /**
   * Stage 6: Persists validated project records, snapshots, predictions, and warnings to PostgreSQL.
   */
  async saveImportedDataset(
    records: CanonicalProjectRecord[],
    predictions: DataLabPredictionResult[],
    provenance: ImportProvenance
  ): Promise<{ savedProjectsCount: number; savedPredictionsCount: number }> {
    let savedProjectsCount = 0
    let savedPredictionsCount = 0

    // Use transaction for atomic consistency
    await prisma.$transaction(async tx => {
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        const pred = predictions.find(p => p.projectId === rec.project_id) || predictions[i]

        // 1. Upsert Project (mark as isSynthetic: false)
        const project = await tx.project.upsert({
          where: { projectId: rec.project_id },
          update: {
            name: rec.project_name || rec.project_id,
            ministry: rec.ministry,
            sector: rec.sector,
            implementingAgency: rec.implementing_agency,
            state: rec.state,
            originalCostCr: rec.original_cost_cr,
            plannedDurationMonths: rec.planned_duration_months,
            status: rec.project_status || 'Ongoing',
            isSynthetic: false, // Explicitly label as imported public/official data
          },
          create: {
            projectId: rec.project_id,
            name: rec.project_name || rec.project_id,
            ministry: rec.ministry,
            sector: rec.sector,
            implementingAgency: rec.implementing_agency,
            state: rec.state,
            originalCostCr: rec.original_cost_cr,
            plannedDurationMonths: rec.planned_duration_months,
            status: rec.project_status || 'Ongoing',
            isSynthetic: false,
          },
        })
        savedProjectsCount++

        // 2. Upsert ProjectUpdate (snapshot)
        const update = await tx.projectUpdate.upsert({
          where: {
            projectId_snapshotMonth: {
              projectId: rec.project_id,
              snapshotMonth: rec.snapshot_month,
            },
          },
          update: {
            elapsedMonths: rec.elapsed_months,
            physicalProgressPct: rec.physical_progress_pct,
            financialProgressPct: rec.financial_progress_pct,
            expenditureCr: rec.expenditure_cr,
            milestonesTotal: rec.milestones_total,
            milestonesDelayed: rec.milestones_delayed,
            projectStatus: rec.project_status || 'Ongoing',
          },
          create: {
            projectId: rec.project_id,
            snapshotMonth: rec.snapshot_month,
            elapsedMonths: rec.elapsed_months,
            physicalProgressPct: rec.physical_progress_pct,
            financialProgressPct: rec.financial_progress_pct,
            expenditureCr: rec.expenditure_cr,
            milestonesTotal: rec.milestones_total,
            milestonesDelayed: rec.milestones_delayed,
            projectStatus: rec.project_status || 'Ongoing',
          },
        })

        // 3. Create Prediction if exists
        if (pred) {
          const predictionRecord = await tx.prediction.create({
            data: {
              projectId: rec.project_id,
              projectUpdateId: update.id,
              costOverrunProbability: pred.costOverrunProbability,
              costPrediction: pred.costPrediction,
              timeOverrunProbability: pred.timeOverrunProbability,
              timePrediction: pred.timePrediction,
              costModelVersion: provenance.modelVersion || 'v1.0-logistic',
              timeModelVersion: provenance.modelVersion || 'v1.0-rf',
              overallRiskLevel: pred.overallRiskLevel,
            },
          })
          savedPredictionsCount++

          // 4. Create Early Warnings
          if (pred.earlyWarnings && pred.earlyWarnings.length > 0) {
            for (const w of pred.earlyWarnings) {
              await tx.earlyWarning.create({
                data: {
                  projectId: rec.project_id,
                  projectUpdateId: update.id,
                  predictionId: predictionRecord.id,
                  warningType: w.warningType,
                  severity: w.severity,
                  title: w.title,
                  message: w.message,
                },
              })
            }
          }
        }
      }
    })

    return {
      savedProjectsCount,
      savedPredictionsCount,
    }
  }
}

export const dataLabService = new DataLabService()
