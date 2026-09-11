/**
 * Prediction Orchestration Service.
 *
 * Coordinates between PostgreSQL project data, the external FastAPI ML service,
 * prediction persistence, and early warning rule evaluation.
 */

import { prisma } from '@/lib/db'
import { mlClient, PredictPayload } from '@/lib/ml-client'
import { calculateOverallRisk, evaluateEarlyWarnings } from '@/lib/risk-engine'

export class PredictionService {
  /**
   * Generates a new prediction for the latest snapshot of a project.
   *
   * Flow:
   * 1. Retrieve project and its latest monitoring snapshot
   * 2. Construct observation-time payload (strictly no target outcomes)
   * 3. Call FastAPI ML service via mlClient
   * 4. Calculate overall risk level
   * 5. Store Prediction in PostgreSQL
   * 6. Evaluate and store EarlyWarning records
   * 7. Return stored prediction with generated warnings
   */
  async generatePrediction(projectId: string) {
    // 1. Retrieve project
    const project = await prisma.project.findUnique({
      where: { projectId },
      include: {
        updates: {
          orderBy: { snapshotMonth: 'desc' },
          take: 1,
        },
      },
    })

    if (!project) {
      throw new Error(`Project with ID '${projectId}' not found`)
    }

    const latestUpdate = project.updates[0]
    if (!latestUpdate) {
      throw new Error(`Project '${projectId}' has no monitoring snapshots available to predict on`)
    }

    // 2. Construct observation-time payload
    const payload: PredictPayload = {
      project_id: project.projectId,
      snapshot_month: latestUpdate.snapshotMonth,
      ministry: project.ministry,
      sector: project.sector,
      implementing_agency: project.implementingAgency,
      state: project.state,
      original_cost_cr: project.originalCostCr,
      planned_duration_months: project.plannedDurationMonths,
      elapsed_months: latestUpdate.elapsedMonths,
      physical_progress_pct: latestUpdate.physicalProgressPct,
      financial_progress_pct: latestUpdate.financialProgressPct,
      expenditure_cr: latestUpdate.expenditureCr,
      milestones_total: latestUpdate.milestonesTotal,
      milestones_delayed: latestUpdate.milestonesDelayed,
      project_status: latestUpdate.projectStatus,
    }

    // 3. Call FastAPI ML Service
    const mlResponse = await mlClient.predictOverrun(payload)

    // 4. Calculate overall risk level
    const costProb = mlResponse.cost_overrun.probability
    const timeProb = mlResponse.time_overrun.probability
    const costPred = mlResponse.cost_overrun.prediction
    const timePred = mlResponse.time_overrun.prediction

    const overallRisk = calculateOverallRisk(costProb, timeProb, costPred, timePred)

    // 5. Persist Prediction in PostgreSQL transaction
    const result = await prisma.$transaction(async (tx) => {
      const storedPrediction = await tx.prediction.create({
        data: {
          projectId: project.projectId,
          projectUpdateId: latestUpdate.id,
          costOverrunProbability: costProb,
          costPrediction: costPred,
          timeOverrunProbability: timeProb,
          timePrediction: timePred,
          costModelVersion: 'Logistic Regression (L2)',
          timeModelVersion: 'Random Forest (150 trees)',
          overallRiskLevel: overallRisk,
        },
      })

      // 6. Evaluate deterministic prototype early warnings
      const warningCandidates = evaluateEarlyWarnings(
        {
          projectId: project.projectId,
          originalCostCr: project.originalCostCr,
          plannedDurationMonths: project.plannedDurationMonths,
        },
        {
          elapsedMonths: latestUpdate.elapsedMonths,
          physicalProgressPct: latestUpdate.physicalProgressPct,
          financialProgressPct: latestUpdate.financialProgressPct,
          milestonesTotal: latestUpdate.milestonesTotal,
          milestonesDelayed: latestUpdate.milestonesDelayed,
          projectStatus: latestUpdate.projectStatus,
        },
        {
          costOverrunProbability: costProb,
          costPrediction: costPred,
          timeOverrunProbability: timeProb,
          timePrediction: timePred,
        }
      )

      // Store warnings if any triggered
      const createdWarnings = []
      for (const w of warningCandidates) {
        const warning = await tx.earlyWarning.create({
          data: {
            projectId: project.projectId,
            projectUpdateId: latestUpdate.id,
            predictionId: storedPrediction.id,
            warningType: w.warningType,
            severity: w.severity,
            title: w.title,
            message: w.message,
          },
        })
        createdWarnings.push(warning)
      }

      return {
        prediction: storedPrediction,
        warnings: createdWarnings,
      }
    })

    return result
  }
}

export const predictionService = new PredictionService()
export default predictionService
