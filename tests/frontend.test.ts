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
import { projectService } from '../lib/services/project-service'
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

describe('4. Early Warning Center & Alerts Service', () => {
  test('retrieves alerts with summary counts and pagination', async () => {
    const res = await projectService.getAlerts({ limit: 10 })
    assert.ok(res.total > 0, 'Must have at least one alert')
    assert.strictEqual(res.alerts.length, Math.min(res.total, 10))
    assert.ok(res.summary.total >= res.total, 'Summary total must be >= filtered total')
    assert.ok(res.summary.critical >= 0, 'Critical count must be non-negative')
    assert.ok(res.summary.high >= 0, 'High count must be non-negative')
  })

  test('filters alerts by severity accurately', async () => {
    const criticalRes = await projectService.getAlerts({ severity: 'CRITICAL', limit: 20 })
    assert.ok(criticalRes.alerts.length > 0, 'Should have critical alerts')
    for (const a of criticalRes.alerts) {
      assert.strictEqual(
        a.severity,
        'CRITICAL',
        `Expected severity CRITICAL, got ${a.severity}`
      )
    }
  })

  test('filters alerts by warning type accurately', async () => {
    const costRes = await projectService.getAlerts({
      warningType: 'COST_OVERRUN_RISK',
      limit: 20,
    })
    assert.ok(costRes.alerts.length > 0, 'Should have cost overrun alerts')
    for (const a of costRes.alerts) {
      assert.strictEqual(
        a.warningType,
        'COST_OVERRUN_RISK',
        `Expected warningType COST_OVERRUN_RISK, got ${a.warningType}`
      )
    }
  })

  test('filters alerts by project ID', async () => {
    const projectRes = await projectService.getAlerts({
      projectId: 'PRJ-0001',
      limit: 10,
    })
    assert.ok(projectRes.alerts.length > 0, 'PRJ-0001 should have alerts')
    for (const a of projectRes.alerts) {
      assert.strictEqual(a.projectId, 'PRJ-0001')
      assert.ok(a.project, 'Alert must have project details attached')
      assert.strictEqual(a.project.projectId, 'PRJ-0001')
    }
  })

  test('alert records preserve target outcome quarantine', async () => {
    const res = await projectService.getAlerts({ limit: 20 })
    for (const a of res.alerts) {
      assert.strictEqual((a as any).final_cost_cr, undefined)
      assert.strictEqual((a as any).actual_duration_months, undefined)
      assert.strictEqual((a as any).cost_overrun, undefined)
      assert.strictEqual((a as any).time_overrun, undefined)

      if (a.project) {
        assert.strictEqual((a.project as any).final_cost_cr, undefined)
        assert.strictEqual((a.project as any).actual_duration_months, undefined)
        assert.strictEqual((a.project as any).cost_overrun, undefined)
        assert.strictEqual((a.project as any).time_overrun, undefined)
      }
    }
  })
})

describe('5. Portfolio Analytics & Aggregations', () => {
  test('computes complete portfolio analytics payload with 850 projects', async () => {
    const data = await projectService.getAnalyticsData({})
    assert.strictEqual(data.summary.totalProjects, 850)
    assert.ok(data.summary.totalSanctionedCostCr > 0)
    assert.ok(data.summary.totalExpenditureCr > 0)
    assert.ok(data.summary.costRiskExposureCr > 0)
    assert.ok(data.summary.scheduleDelayExposureCount > 0)

    const dist = data.riskDistribution
    const totalRiskCount = dist.LOW.count + dist.MEDIUM.count + dist.HIGH.count + dist.CRITICAL.count
    assert.strictEqual(totalRiskCount, 850)

    const totalRiskPct = Math.round(dist.LOW.percentage + dist.MEDIUM.percentage + dist.HIGH.percentage + dist.CRITICAL.percentage)
    assert.ok(totalRiskPct >= 99 && totalRiskPct <= 101)

    // Verify probability buckets
    assert.strictEqual(data.costProbabilityBuckets.length, 5)
    assert.strictEqual(data.timeProbabilityBuckets.length, 5)
    const costBucketTotal = data.costProbabilityBuckets.reduce((acc, b) => acc + b.count, 0)
    assert.strictEqual(costBucketTotal, 850)
  })

  test('sector aggregations sum to total projects', async () => {
    const data = await projectService.getAnalyticsData({})
    assert.ok(data.bySector.length >= 6)
    const sectorProjectsSum = data.bySector.reduce((acc, s) => acc + s.totalProjects, 0)
    assert.strictEqual(sectorProjectsSum, 850)

    for (const sec of data.bySector) {
      assert.strictEqual(
        sec.totalProjects,
        sec.critical + sec.high + sec.medium + sec.low,
        `Sector ${sec.sector} tier breakdown must sum to total projects`
      )
      assert.ok(sec.avgCostRisk >= 0 && sec.avgCostRisk <= 1)
      assert.ok(sec.avgTimeRisk >= 0 && sec.avgTimeRisk <= 1)
    }
  })

  test('filters analytics accurately by sector', async () => {
    const filtered = await projectService.getAnalyticsData({ sector: 'Roads and Highways' })
    assert.ok(filtered.summary.totalProjects > 0)
    assert.ok(filtered.summary.totalProjects < 850)

    for (const p of filtered.scatterPoints) {
      assert.strictEqual(p.sector, 'Roads and Highways')
    }
  })

  test('scatter points preserve target outcome quarantine', async () => {
    const data = await projectService.getAnalyticsData({})
    assert.strictEqual(data.scatterPoints.length, 850)

    for (const p of data.scatterPoints) {
      const rec = p as unknown as Record<string, unknown>
      assert.strictEqual(rec.cost_overrun, undefined)
      assert.strictEqual(rec.time_overrun, undefined)
      assert.strictEqual(rec.final_cost_cr, undefined)
      assert.strictEqual(rec.actual_duration_months, undefined)

      assert.ok(p.physicalProgressPct >= 0 && p.physicalProgressPct <= 100)
      assert.ok(p.financialProgressPct >= 0 && p.financialProgressPct <= 100)
      assert.ok(p.costOverrunProbability >= 0 && p.costOverrunProbability <= 1)
      assert.ok(p.timeOverrunProbability >= 0 && p.timeOverrunProbability <= 1)
    }
  })

  test('compares two projects accurately side-by-side', async () => {
    const comp = await projectService.compareProjects('PRJ-0001', 'PRJ-0002')
    assert.ok(comp.projectA)
    assert.ok(comp.projectB)

    assert.strictEqual(comp.projectA?.projectId, 'PRJ-0001')
    assert.strictEqual(comp.projectB?.projectId, 'PRJ-0002')

    assert.ok(comp.projectA!.originalCostCr > 0)
    assert.ok(comp.projectB!.originalCostCr > 0)

    // Verify burn gap formula: financial - physical
    assert.strictEqual(
      comp.projectA!.burnGap,
      Math.round((comp.projectA!.financialProgressPct - comp.projectA!.physicalProgressPct) * 10) / 10
    )

    // Verify outcome quarantine on comparison response
    const recA = comp.projectA as unknown as Record<string, unknown>
    assert.strictEqual(recA.cost_overrun, undefined)
    assert.strictEqual(recA.time_overrun, undefined)
  })
})
