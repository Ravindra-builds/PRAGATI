/**
 * End-to-End Integration Test Suite.
 *
 * Verifies the full integration path:
 *   Project Snapshot Payload -> ML Client -> FastAPI /predict -> Risk Evaluation -> Early Warning
 *
 * Note: If ML service is running locally on port 8000, performs live HTTP inference;
 * otherwise verifies the contract hermetically.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { MLClient, PredictPayload } from '../lib/ml-client'
import { calculateOverallRisk, evaluateEarlyWarnings } from '../lib/risk-engine'

describe('End-to-End Integration Flow', () => {
  const samplePayload: PredictPayload = {
    project_id: 'PRJ-0714',
    snapshot_month: '2025-06',
    ministry: 'Ministry of Housing and Urban Affairs',
    sector: 'Urban Development',
    implementing_agency: 'NBCC',
    state: 'Madhya Pradesh',
    original_cost_cr: 1200.0,
    planned_duration_months: 27,
    elapsed_months: 22,
    physical_progress_pct: 47.6,
    financial_progress_pct: 63.6,
    expenditure_cr: 763.0,
    milestones_total: 6,
    milestones_delayed: 2,
    project_status: 'Critical',
  }

  test('executes end-to-end inference flow and warning generation', async () => {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'
    const client = new MLClient(mlUrl)

    let isLiveService = false
    try {
      const health = await client.checkHealth()
      if (health.status === 'healthy' && health.models_loaded) {
        isLiveService = true
      }
    } catch {
      // Service offline; test will run against contract mock
    }

    let predictionResult: {
      costOverrunProbability: number
      costPrediction: number
      timeOverrunProbability: number
      timePrediction: number
    }

    if (isLiveService) {
      console.log('  [Integration] Testing against live FastAPI ML service at', mlUrl)
      const liveRes = await client.predictOverrun(samplePayload)
      assert.strictEqual(liveRes.project_id, 'PRJ-0714')
      assert.ok(liveRes.cost_overrun.probability >= 0.0 && liveRes.cost_overrun.probability <= 1.0)
      assert.ok([0, 1].includes(liveRes.cost_overrun.prediction))
      assert.ok(liveRes.time_overrun.probability >= 0.0 && liveRes.time_overrun.probability <= 1.0)
      assert.ok([0, 1].includes(liveRes.time_overrun.prediction))

      predictionResult = {
        costOverrunProbability: liveRes.cost_overrun.probability,
        costPrediction: liveRes.cost_overrun.prediction,
        timeOverrunProbability: liveRes.time_overrun.probability,
        timePrediction: liveRes.time_overrun.prediction,
      }
    } else {
      console.log('  [Integration] FastAPI service offline; testing contract simulation')
      // Simulated prediction matching PRJ-0714 high risk profile
      predictionResult = {
        costOverrunProbability: 0.9993,
        costPrediction: 1,
        timeOverrunProbability: 0.9285,
        timePrediction: 1,
      }
    }

    // Step 2: Risk Scoring
    const overallRisk = calculateOverallRisk(
      predictionResult.costOverrunProbability,
      predictionResult.timeOverrunProbability,
      predictionResult.costPrediction,
      predictionResult.timePrediction
    )
    assert.strictEqual(overallRisk, 'HIGH')

    // Step 3: Early Warning Rule Evaluation
    const warnings = evaluateEarlyWarnings(
      {
        projectId: samplePayload.project_id,
        originalCostCr: samplePayload.original_cost_cr,
        plannedDurationMonths: samplePayload.planned_duration_months,
      },
      {
        elapsedMonths: samplePayload.elapsed_months,
        physicalProgressPct: samplePayload.physical_progress_pct,
        financialProgressPct: samplePayload.financial_progress_pct,
        milestonesTotal: samplePayload.milestones_total,
        milestonesDelayed: samplePayload.milestones_delayed,
        projectStatus: samplePayload.project_status,
      },
      predictionResult
    )

    // PRJ-0714 has high cost risk, high delay risk, milestone slippage (2/6 = 33%), and burn gap (63.6 - 47.6 = 16%)
    assert.ok(warnings.length >= 2, `Expected at least 2 warnings, got ${warnings.length}`)
    assert.ok(warnings.some((w) => w.warningType === 'COST_OVERRUN_RISK'))
    assert.ok(warnings.some((w) => w.warningType === 'SCHEDULE_DELAY_RISK'))
    assert.ok(warnings.some((w) => w.warningType === 'CRITICAL_MILESTONE_SLIPPAGE'))
    assert.ok(warnings.some((w) => w.warningType === 'EXPENDITURE_BURN_ANOMALY'))
  })
})
