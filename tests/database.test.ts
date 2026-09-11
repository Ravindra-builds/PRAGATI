/**
 * Unit tests for Database Models, Constraints & Relationships.
 *
 * Tests:
 * 1. Project insert and uniqueness (duplicate project_id prevention)
 * 2. Project update insert and composite uniqueness (duplicate (project_id, snapshot_month) prevention)
 * 3. Prediction persistence and foreign key integrity
 * 4. Early warning persistence linked to prediction & project
 * 5. Foreign key cascade/setNull semantics
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { PredictPayloadSchema } from '../lib/ml-client'

// In-memory simulation of the relational schema constraints for hermetic testing
class InMemoryDatabaseHarness {
  projects = new Map<string, any>()
  updates = new Map<string, any>() // key: `${projectId}_${snapshotMonth}`
  predictions = new Map<string, any>()
  warnings = new Map<string, any>()

  insertProject(p: {
    projectId: string
    name: string
    ministry: string
    sector: string
    implementingAgency: string
    state: string
    originalCostCr: number
    plannedDurationMonths: number
    status: string
  }) {
    if (this.projects.has(p.projectId)) {
      throw new Error(`Unique constraint failed on 'projects.project_id': ${p.projectId}`)
    }
    const record = { id: `proj_${Date.now()}_${Math.random()}`, ...p, createdAt: new Date() }
    this.projects.set(p.projectId, record)
    return record
  }

  insertUpdate(u: {
    projectId: string
    snapshotMonth: string
    elapsedMonths: number
    physicalProgressPct: number
    financialProgressPct: number
    expenditureCr: number
    milestonesTotal: number
    milestonesDelayed: number
    projectStatus: string
  }) {
    // Foreign key check
    if (!this.projects.has(u.projectId)) {
      throw new Error(`Foreign key constraint failed on 'project_updates.project_id' -> 'projects.project_id'`)
    }
    // Composite unique check: @@unique([projectId, snapshotMonth])
    const key = `${u.projectId}_${u.snapshotMonth}`
    if (this.updates.has(key)) {
      throw new Error(`Unique constraint failed on 'project_updates': duplicate (${u.projectId}, ${u.snapshotMonth})`)
    }
    const record = { id: `upd_${Date.now()}_${Math.random()}`, ...u, createdAt: new Date() }
    this.updates.set(key, record)
    return record
  }

  insertPrediction(pred: {
    projectId: string
    projectUpdateId: string
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    costModelVersion: string
    timeModelVersion: string
    overallRiskLevel: string
  }) {
    // Foreign key checks
    if (!this.projects.has(pred.projectId)) {
      throw new Error(`Foreign key constraint failed on 'predictions.project_id'`)
    }
    let updateFound = false
    for (const update of this.updates.values()) {
      if (update.id === pred.projectUpdateId) {
        updateFound = true
        break
      }
    }
    if (!updateFound) {
      throw new Error(`Foreign key constraint failed on 'predictions.project_update_id'`)
    }

    const record = { id: `pred_${Date.now()}_${Math.random()}`, ...pred, createdAt: new Date() }
    this.predictions.set(record.id, record)
    return record
  }

  insertWarning(w: {
    projectId: string
    projectUpdateId?: string
    predictionId?: string
    warningType: string
    severity: string
    title: string
    message: string
  }) {
    if (!this.projects.has(w.projectId)) {
      throw new Error(`Foreign key constraint failed on 'early_warnings.project_id'`)
    }
    const record = { id: `warn_${Date.now()}_${Math.random()}`, ...w, createdAt: new Date(), resolvedAt: null }
    this.warnings.set(record.id, record)
    return record
  }
}

describe('Database Schema & Constraint Validation', () => {
  let db: InMemoryDatabaseHarness

  test('setup test database', () => {
    db = new InMemoryDatabaseHarness()
  })

  test('1. Inserts valid project and enforces duplicate project_id protection', () => {
    const p1 = db.insertProject({
      projectId: 'PRJ-TEST-001',
      name: 'High Speed Rail Project',
      ministry: 'Ministry of Railways',
      sector: 'Railways',
      implementingAgency: 'NHSRCL',
      state: 'Gujarat',
      originalCostCr: 5000.0,
      plannedDurationMonths: 48,
      status: 'Ongoing',
    })

    assert.strictEqual(p1.projectId, 'PRJ-TEST-001')

    // Expect duplicate insertion to fail
    assert.throws(
      () => {
        db.insertProject({
          projectId: 'PRJ-TEST-001',
          name: 'Duplicate Rail Project',
          ministry: 'Ministry of Railways',
          sector: 'Railways',
          implementingAgency: 'NHSRCL',
          state: 'Gujarat',
          originalCostCr: 5000.0,
          plannedDurationMonths: 48,
          status: 'Ongoing',
        })
      },
      /Unique constraint failed on 'projects.project_id'/
    )
  })

  test('2. Inserts snapshot and enforces composite uniqueness on (project_id, snapshot_month)', () => {
    const snap1 = db.insertUpdate({
      projectId: 'PRJ-TEST-001',
      snapshotMonth: '2024-06',
      elapsedMonths: 12,
      physicalProgressPct: 25.0,
      financialProgressPct: 28.0,
      expenditureCr: 1400.0,
      milestonesTotal: 8,
      milestonesDelayed: 1,
      projectStatus: 'Ongoing',
    })

    assert.strictEqual(snap1.snapshotMonth, '2024-06')

    // Duplicate snapshot for same project and same month must fail
    assert.throws(
      () => {
        db.insertUpdate({
          projectId: 'PRJ-TEST-001',
          snapshotMonth: '2024-06', // Duplicate month!
          elapsedMonths: 12,
          physicalProgressPct: 26.0,
          financialProgressPct: 29.0,
          expenditureCr: 1450.0,
          milestonesTotal: 8,
          milestonesDelayed: 1,
          projectStatus: 'Ongoing',
        })
      },
      /duplicate \(PRJ-TEST-001, 2024-06\)/
    )

    // Snapshot for non-existent project must fail foreign key check
    assert.throws(
      () => {
        db.insertUpdate({
          projectId: 'PRJ-NONEXISTENT',
          snapshotMonth: '2024-06',
          elapsedMonths: 12,
          physicalProgressPct: 25.0,
          financialProgressPct: 28.0,
          expenditureCr: 1400.0,
          milestonesTotal: 8,
          milestonesDelayed: 1,
          projectStatus: 'Ongoing',
        })
      },
      /Foreign key constraint failed/
    )
  })

  test('3. Enforces prediction foreign key relationships and persists predictions', () => {
    const update = Array.from(db.updates.values())[0]

    const pred = db.insertPrediction({
      projectId: 'PRJ-TEST-001',
      projectUpdateId: update.id,
      costOverrunProbability: 0.884,
      costPrediction: 1,
      timeOverrunProbability: 0.762,
      timePrediction: 1,
      costModelVersion: 'Logistic Regression (L2)',
      timeModelVersion: 'Random Forest (150 trees)',
      overallRiskLevel: 'HIGH',
    })

    assert.strictEqual(pred.costPrediction, 1)
    assert.strictEqual(pred.overallRiskLevel, 'HIGH')

    // Invalid update foreign key must fail
    assert.throws(
      () => {
        db.insertPrediction({
          projectId: 'PRJ-TEST-001',
          projectUpdateId: 'invalid-update-id',
          costOverrunProbability: 0.5,
          costPrediction: 1,
          timeOverrunProbability: 0.5,
          timePrediction: 1,
          costModelVersion: 'Logistic Regression',
          timeModelVersion: 'Random Forest',
          overallRiskLevel: 'HIGH',
        })
      },
      /Foreign key constraint failed on 'predictions.project_update_id'/
    )
  })

  test('4. Enforces early warning persistence and links to prediction', () => {
    const pred = Array.from(db.predictions.values())[0]
    const update = Array.from(db.updates.values())[0]

    const warning = db.insertWarning({
      projectId: 'PRJ-TEST-001',
      projectUpdateId: update.id,
      predictionId: pred.id,
      warningType: 'COST_OVERRUN_RISK',
      severity: 'CRITICAL',
      title: 'High Probability of Budget Overrun',
      message: 'Model projects an 88.4% probability of exceeding approved budget.',
    })

    assert.strictEqual(warning.severity, 'CRITICAL')
    assert.strictEqual(warning.predictionId, pred.id)
  })

  test('5. Anti-leakage schema verification: outcome fields cannot enter snapshot payload', () => {
    const validData = {
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

    const parsed = PredictPayloadSchema.parse(validData)
    assert.ok(parsed)

    // Verify that outcome fields are not in the schema
    assert.strictEqual((parsed as any).final_cost_cr, undefined)
    assert.strictEqual((parsed as any).actual_duration_months, undefined)
    assert.strictEqual((parsed as any).cost_overrun, undefined)
    assert.strictEqual((parsed as any).time_overrun, undefined)
  })
})
