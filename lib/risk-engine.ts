/**
 * Risk Interpretation and Early Warning Engine.
 *
 * Evaluates prototype risk tiers and deterministic warning rules.
 * Keeps business decision logic strictly decoupled from ML model weights.
 *
 * NOTE: These are prototype heuristic rules designed for SIH demonstration,
 * NOT official government ministry policies.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface WarningCandidate {
  warningType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
}

export interface WarningInputProject {
  projectId: string
  originalCostCr: number
  plannedDurationMonths: number
}

export interface WarningInputUpdate {
  elapsedMonths: number
  physicalProgressPct: number
  financialProgressPct: number
  milestonesTotal: number
  milestonesDelayed: number
  projectStatus: string
}

export interface WarningInputPrediction {
  costOverrunProbability: number
  costPrediction: number
  timeOverrunProbability: number
  timePrediction: number
}

/**
 * Maps dual-target model probabilities and predictions into a unified risk tier.
 * Reuses the ML service decision threshold (0.50).
 */
export function calculateOverallRisk(
  costProb: number,
  timeProb: number,
  costPred: number,
  timePred: number
): RiskLevel {
  if (costPred === 1 && timePred === 1) {
    return 'HIGH'
  }
  if (costProb >= 0.75 || timeProb >= 0.75) {
    return 'HIGH'
  }
  if (costPred === 1 || timePred === 1) {
    return 'MEDIUM'
  }
  if (costProb >= 0.40 || timeProb >= 0.40) {
    return 'MEDIUM'
  }
  return 'LOW'
}

/**
 * Deterministically evaluates whether project indicators and ML predictions warrant
 * creating early warning records.
 */
export function evaluateEarlyWarnings(
  project: WarningInputProject,
  update: WarningInputUpdate,
  prediction: WarningInputPrediction
): WarningCandidate[] {
  const warnings: WarningCandidate[] = []

  // Rule 1: High Cost Overrun Risk
  if (prediction.costPrediction === 1) {
    const isCritical = prediction.costOverrunProbability >= 0.80
    warnings.push({
      warningType: 'COST_OVERRUN_RISK',
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      title: 'High Probability of Budget Overrun',
      message: `Model projects a ${(prediction.costOverrunProbability * 100).toFixed(1)}% probability of exceeding approved sanction of ₹${project.originalCostCr} Cr.`,
    })
  }

  // Rule 2: Schedule Delay Risk
  if (prediction.timePrediction === 1) {
    const isCritical = prediction.timeOverrunProbability >= 0.80
    warnings.push({
      warningType: 'SCHEDULE_DELAY_RISK',
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      title: 'Significant Schedule Slippage Predicted',
      message: `Model projects a ${(prediction.timeOverrunProbability * 100).toFixed(1)}% probability of exceeding approved duration of ${project.plannedDurationMonths} months.`,
    })
  }

  // Rule 3: Deteriorating Milestone Slippage (>= 30% of milestones delayed)
  if (update.milestonesTotal > 0) {
    const slippageRatio = update.milestonesDelayed / update.milestonesTotal
    if (slippageRatio >= 0.30) {
      const isCritical = slippageRatio >= 0.50
      warnings.push({
        warningType: 'CRITICAL_MILESTONE_SLIPPAGE',
        severity: isCritical ? 'CRITICAL' : 'MEDIUM',
        title: 'Excessive Milestone Slippage',
        message: `${update.milestonesDelayed} of ${update.milestonesTotal} milestones (${(slippageRatio * 100).toFixed(0)}%) are delayed against contractual schedules.`,
      })
    }
  }

  // Rule 4: Financial vs Physical Progress Discrepancy (burn gap >= 15%)
  const burnGap = update.financialProgressPct - update.physicalProgressPct
  if (burnGap >= 15.0) {
    warnings.push({
      warningType: 'EXPENDITURE_BURN_ANOMALY',
      severity: burnGap >= 25.0 ? 'HIGH' : 'MEDIUM',
      title: 'Disproportionate Financial Burn Rate',
      message: `Financial utilization (${update.financialProgressPct.toFixed(1)}%) leads physical delivery (${update.physicalProgressPct.toFixed(1)}%) by ${burnGap.toFixed(1)}%, signaling expenditure without proportional physical progress.`,
    })
  }

  return warnings
}
