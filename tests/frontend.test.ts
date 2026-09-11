/**
 * Frontend and Data Service Validation Tests
 *
 * Tests:
 * 1. Resilient synthetic dataset parsing and querying
 * 2. Portfolio dashboard summary metrics and risk distribution
 * 3. Search and filtering logic across sectors, statuses, and keywords
 * 4. Project detail retrieval and chronological snapshot ordering
 * 5. Target quarantine integrity in dataset services
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { syntheticDatasetService } from '../lib/services/synthetic-dataset'
import { calculateOverallRisk } from '../lib/risk-engine'

describe('1. Synthetic Dataset Service & Resilience', () => {
  test('successfully loads all 850 projects from synthetic dataset', () => {
    const result = syntheticDatasetService.getProjects({ limit: 10 })
    assert.strictEqual(result.total, 850, `Expected 850 projects, got ${result.total}`)
    assert.strictEqual(result.projects.length, 10, 'Expected 10 items in first page')
  })

  test('filters projects by sector and search query correctly', () => {
    const railwayResult = syntheticDatasetService.getProjects({
      sector: 'Railways',
      limit: 50,
    })
    assert.ok(railwayResult.total > 0, 'Expected railways projects to be found')
    for (const p of railwayResult.projects) {
      assert.strictEqual(
        p.sector.toLowerCase(),
        'railways',
        `Expected sector to be Railways, got ${p.sector}`
      )
    }

    const searchResult = syntheticDatasetService.getProjects({
      query: 'PRJ-0001',
      limit: 10,
    })
    assert.ok(searchResult.total >= 1, 'Expected to find PRJ-0001')
    assert.strictEqual(searchResult.projects[0].projectId, 'PRJ-0001')
  })

  test('retrieves single project with chronological updates', () => {
    const project = syntheticDatasetService.getProjectById('PRJ-0001')
    assert.ok(project, 'Project PRJ-0001 must exist')
    assert.strictEqual(project.projectId, 'PRJ-0001')
    assert.ok(project.updates.length > 0, 'Project must have updates')

    // Verify chronological order of snapshot months
    for (let i = 1; i < project.updates.length; i++) {
      const prev = project.updates[i - 1].snapshotMonth
      const curr = project.updates[i].snapshotMonth
      assert.ok(
        prev.localeCompare(curr) <= 0,
        `Snapshots must be chronologically ordered: ${prev} should be <= ${curr}`
      )
    }
  })
})

describe('2. Dashboard Summary & Risk Distribution', () => {
  test('computes portfolio totals, expenditure, and risk tiers', () => {
    const summary = syntheticDatasetService.getSummary()

    assert.strictEqual(summary.totalProjects, 850)
    assert.ok(summary.totalSanctionedCostCr > 0, 'Sanctioned cost must be > 0')
    assert.ok(summary.totalExpenditureCr > 0, 'Expenditure must be > 0')

    const dist = summary.riskDistribution
    const totalCategorized = dist.LOW + dist.MEDIUM + dist.HIGH + dist.CRITICAL
    assert.strictEqual(
      totalCategorized,
      850,
      `All 850 projects must be categorized into risk tiers, got ${totalCategorized}`
    )

    assert.ok(summary.filterOptions.sectors.length >= 6, 'Must have at least 6 distinct sectors')
    assert.ok(summary.filterOptions.ministries.length >= 5, 'Must have at least 5 distinct ministries')
  })

  test('returns high-priority attention projects', () => {
    const summary = syntheticDatasetService.getSummary()
    assert.ok(summary.attentionProjects.length > 0, 'Should have attention projects')
    assert.ok(summary.attentionProjects.length <= 8, 'Should cap attention projects at 8')

    // Every attention project must be either HIGH or CRITICAL
    for (const p of summary.attentionProjects) {
      const risk = p.latestPrediction?.overallRiskLevel
      assert.ok(
        risk === 'HIGH' || risk === 'CRITICAL',
        `Attention projects must be HIGH or CRITICAL, got ${risk}`
      )
    }
  })
})

describe('3. Target Outcome Quarantine in Data Services', () => {
  test('synthetic project and update objects do not leak outcome variables', () => {
    const project = syntheticDatasetService.getProjectById('PRJ-0001')
    assert.ok(project)

    // Project level
    assert.strictEqual((project as any).final_cost_cr, undefined)
    assert.strictEqual((project as any).actual_duration_months, undefined)
    assert.strictEqual((project as any).cost_overrun, undefined)
    assert.strictEqual((project as any).time_overrun, undefined)

    // Update level
    for (const update of project.updates) {
      assert.strictEqual((update as any).final_cost_cr, undefined)
      assert.strictEqual((update as any).actual_duration_months, undefined)
      assert.strictEqual((update as any).cost_overrun, undefined)
      assert.strictEqual((update as any).time_overrun, undefined)
    }
  })
})
