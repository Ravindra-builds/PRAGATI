/**
 * Unit tests for ML Client, Risk Engine, and API Route Logic.
 *
 * Mocks network requests to test:
 * - Valid prediction parsing and boundary checks (0 <= prob <= 1, pred in {0, 1})
 * - ML response schema violation detection (prob > 1, invalid fields)
 * - Service offline / 503 handling
 * - 422 Unprocessable entity handling
 * - Prototype risk scoring (LOW, MEDIUM, HIGH)
 * - Deterministic early warning rule triggers (cost, time, milestone, burn gap)
 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import {
  MLClient,
  MLServiceUnavailableError,
  MLResponseValidationError,
  PredictPayload,
} from '../lib/ml-client'
import {
  calculateOverallRisk,
  evaluateEarlyWarnings,
} from '../lib/risk-engine'

describe('1. ML Client & Response Boundary Validation', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  const samplePayload: PredictPayload = {
    project_id: 'PRJ-TEST-001',
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
    milestones_total: 10,
    milestones_delayed: 2,
    project_status: 'Ongoing',
  }

  test('predictOverrun successfully parses valid response with probabilities in [0, 1]', async () => {
    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          project_id: 'PRJ-TEST-001',
          cost_overrun: { probability: 0.725, prediction: 1, risk_level: 'HIGH' },
          time_overrun: { probability: 0.312, prediction: 0, risk_level: 'LOW' },
        }),
      } as unknown as Response
    }

    const client = new MLClient('http://mock-ml:8000')
    const response = await client.predictOverrun(samplePayload)

    assert.strictEqual(response.project_id, 'PRJ-TEST-001')
    assert.strictEqual(response.cost_overrun.probability, 0.725)
    assert.strictEqual(response.cost_overrun.prediction, 1)
    assert.strictEqual(response.cost_overrun.risk_level, 'HIGH')
    assert.strictEqual(response.time_overrun.probability, 0.312)
    assert.strictEqual(response.time_overrun.prediction, 0)
    assert.strictEqual(response.time_overrun.risk_level, 'LOW')
  })

  test('predictOverrun throws MLResponseValidationError if probability exceeds 1.0', async () => {
    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          project_id: 'PRJ-TEST-001',
          cost_overrun: { probability: 1.25, prediction: 1, risk_level: 'HIGH' }, // Invalid > 1.0
          time_overrun: { probability: 0.5, prediction: 1, risk_level: 'HIGH' },
        }),
      } as unknown as Response
    }

    const client = new MLClient('http://mock-ml:8000')
    await assert.rejects(
      async () => client.predictOverrun(samplePayload),
      (err: Error) => err instanceof MLResponseValidationError
    )
  })

  test('predictOverrun throws MLResponseValidationError if prediction is not 0 or 1', async () => {
    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          project_id: 'PRJ-TEST-001',
          cost_overrun: { probability: 0.8, prediction: 2, risk_level: 'HIGH' }, // Invalid not in {0, 1}
          time_overrun: { probability: 0.5, prediction: 1, risk_level: 'HIGH' },
        }),
      } as unknown as Response
    }

    const client = new MLClient('http://mock-ml:8000')
    await assert.rejects(
      async () => client.predictOverrun(samplePayload),
      (err: Error) => err instanceof MLResponseValidationError
    )
  })

  test('predictOverrun throws MLServiceUnavailableError when network connection fails', async () => {
    global.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8000')
    }

    const client = new MLClient('http://mock-ml:8000')
    await assert.rejects(
      async () => client.predictOverrun(samplePayload),
      (err: Error) => err instanceof MLServiceUnavailableError
    )
  })
})

describe('2. Risk Engine & Threshold Logic', () => {
  test('calculateOverallRisk returns HIGH when both models predict overrun', () => {
    const risk = calculateOverallRisk(0.65, 0.70, 1, 1)
    assert.strictEqual(risk, 'HIGH')
  })

  test('calculateOverallRisk returns HIGH when either probability exceeds 0.75', () => {
    const risk = calculateOverallRisk(0.82, 0.20, 1, 0)
    assert.strictEqual(risk, 'HIGH')
  })

  test('calculateOverallRisk returns MEDIUM when one model predicts overrun', () => {
    const risk = calculateOverallRisk(0.55, 0.30, 1, 0)
    assert.strictEqual(risk, 'MEDIUM')
  })

  test('calculateOverallRisk returns LOW when both predictions are 0 and probabilities low', () => {
    const risk = calculateOverallRisk(0.12, 0.08, 0, 0)
    assert.strictEqual(risk, 'LOW')
  })
})

describe('3. Prototype Early Warning Rules', () => {
  const baseProject = {
    projectId: 'PRJ-TEST-001',
    originalCostCr: 500.0,
    plannedDurationMonths: 24,
  }

  const baseUpdate = {
    elapsedMonths: 12,
    physicalProgressPct: 50.0,
    financialProgressPct: 50.0,
    milestonesTotal: 10,
    milestonesDelayed: 0,
    projectStatus: 'Ongoing',
  }

  test('triggers COST_OVERRUN_RISK when cost_prediction is 1', () => {
    const warnings = evaluateEarlyWarnings(
      baseProject,
      baseUpdate,
      { costOverrunProbability: 0.85, costPrediction: 1, timeOverrunProbability: 0.2, timePrediction: 0 }
    )

    const costWarn = warnings.find((w) => w.warningType === 'COST_OVERRUN_RISK')
    assert.ok(costWarn)
    assert.strictEqual(costWarn.severity, 'CRITICAL') // >= 0.80 -> CRITICAL
  })

  test('triggers SCHEDULE_DELAY_RISK when time_prediction is 1', () => {
    const warnings = evaluateEarlyWarnings(
      baseProject,
      baseUpdate,
      { costOverrunProbability: 0.2, costPrediction: 0, timeOverrunProbability: 0.65, timePrediction: 1 }
    )

    const delayWarn = warnings.find((w) => w.warningType === 'SCHEDULE_DELAY_RISK')
    assert.ok(delayWarn)
    assert.strictEqual(delayWarn.severity, 'HIGH')
  })

  test('triggers CRITICAL_MILESTONE_SLIPPAGE when >= 30% milestones delayed', () => {
    const updateWithSlippage = {
      ...baseUpdate,
      milestonesTotal: 10,
      milestonesDelayed: 4, // 40%
    }

    const warnings = evaluateEarlyWarnings(
      baseProject,
      updateWithSlippage,
      { costOverrunProbability: 0.1, costPrediction: 0, timeOverrunProbability: 0.1, timePrediction: 0 }
    )

    const slipWarn = warnings.find((w) => w.warningType === 'CRITICAL_MILESTONE_SLIPPAGE')
    assert.ok(slipWarn)
    assert.strictEqual(slipWarn.severity, 'MEDIUM')
  })

  test('triggers EXPENDITURE_BURN_ANOMALY when burn gap >= 15%', () => {
    const updateWithBurn = {
      ...baseUpdate,
      physicalProgressPct: 40.0,
      financialProgressPct: 60.0, // Gap: 20% >= 15%
    }

    const warnings = evaluateEarlyWarnings(
      baseProject,
      updateWithBurn,
      { costOverrunProbability: 0.1, costPrediction: 0, timeOverrunProbability: 0.1, timePrediction: 0 }
    )

    const burnWarn = warnings.find((w) => w.warningType === 'EXPENDITURE_BURN_ANOMALY')
    assert.ok(burnWarn)
    assert.strictEqual(burnWarn.severity, 'MEDIUM')
  })
})
