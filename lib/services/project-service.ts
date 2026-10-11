/**
 * Project Data Access Service.
 *
 * Encapsulates all database operations for projects and their monitoring snapshots.
 * Provides automatic fallback to the verified synthetic dataset when PostgreSQL is
 * unseeded or offline.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { predictWithEmbeddedWeights } from '../ml-local-engine'
import { calculateOverallRisk } from '../risk-engine'
import {
  syntheticDatasetService,
  AlertFilters,
  AnalyticsFilters,
  AnalyticsPayload,
  ProgressScatterPoint,
  SectorAnalyticsItem,
  MinistryAnalyticsItem,
  StateAnalyticsItem,
  TemporalTrendPoint,
} from './synthetic-dataset'

export type { AlertFilters, AnalyticsFilters, AnalyticsPayload }

export interface ProjectFilters {
  sector?: string
  ministry?: string
  state?: string
  status?: string
  risk?: string
  query?: string
  limit?: number
  offset?: number
}

export interface AttentionProjectSummary {
  id: string
  projectId: string
  name: string
  sector: string
  ministry: string
  state: string
  originalCostCr: number
  latestUpdate: {
    id: string
    projectId: string
    snapshotMonth: string
    elapsedMonths: number
    physicalProgressPct: number
    financialProgressPct: number
    expenditureCr: number
    milestonesTotal: number
    milestonesDelayed: number
    projectStatus: string
    createdAt: Date
  } | null
  latestPrediction: {
    id: string
    projectId: string
    projectUpdateId: string
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    costModelVersion: string
    timeModelVersion: string
    overallRiskLevel: string
    createdAt: Date
  } | null
}

export interface RecentWarningItem {
  id: string
  projectId: string
  projectUpdateId: string | null
  predictionId: string | null
  warningType: string
  severity: string
  title: string
  message: string
  createdAt: Date
  resolvedAt: Date | null
  project?: {
    projectId: string
    sector: string
  }
}

export class ProjectService {
  private analyticsCache = new Map<string, { data: AnalyticsPayload; expiresAt: number }>()
  private summaryCache = new Map<string, { data: any; expiresAt: number }>()

  clearCache() {
    this.analyticsCache.clear()
    this.summaryCache.clear()
  }

  /**
   * List projects with filters, search, and pagination.
   * Includes the latest snapshot and latest prediction summary.
   */
  async getProjects(filters: ProjectFilters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
    const offset = Math.max(Number(filters.offset) || 0, 0)

    try {
      const where: Prisma.ProjectWhereInput = {}

      if (filters.sector && filters.sector !== 'ALL') {
        where.sector = { equals: filters.sector, mode: 'insensitive' }
      }
      if (filters.ministry && filters.ministry !== 'ALL') {
        where.ministry = { equals: filters.ministry, mode: 'insensitive' }
      }
      if (filters.state && filters.state !== 'ALL') {
        where.state = { equals: filters.state, mode: 'insensitive' }
      }
      if (filters.status && filters.status !== 'ALL') {
        where.status = { equals: filters.status, mode: 'insensitive' }
      }
      if (filters.risk && filters.risk !== 'ALL') {
        where.predictions = {
          some: {
            overallRiskLevel: { equals: filters.risk, mode: 'insensitive' },
          },
        }
      }
      if (filters.query) {
        const q = filters.query.trim()
        where.OR = [
          { projectId: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { sector: { contains: q, mode: 'insensitive' } },
          { ministry: { contains: q, mode: 'insensitive' } },
          { state: { contains: q, mode: 'insensitive' } },
          { implementingAgency: { contains: q, mode: 'insensitive' } },
        ]
      }

      const totalBaselineCount = await prisma.project.count()

      if (totalBaselineCount === 0) {
        // Database has no seeded projects; use verified synthetic dataset
        return syntheticDatasetService.getProjects(filters)
      }

      const total = await prisma.project.count({ where })

      const projects = await prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { projectId: 'asc' },
        include: {
          updates: {
            take: 1,
            orderBy: { snapshotMonth: 'desc' },
          },
          predictions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          warnings: {
            where: { resolvedAt: null },
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      const formatted = projects.map((p) => {
        let latestPred = p.predictions[0] || null
        if (!latestPred) {
          const synthFallback = syntheticDatasetService.getProjectById(p.projectId)
          if (synthFallback?.latestPrediction) {
            latestPred = synthFallback.latestPrediction as any
          } else if (p.updates[0]) {
            try {
              const u = p.updates[0]
              const mlRes = predictWithEmbeddedWeights({
                project_id: p.projectId,
                snapshot_month: u.snapshotMonth,
                ministry: p.ministry,
                sector: p.sector,
                implementing_agency: p.implementingAgency,
                state: p.state,
                original_cost_cr: p.originalCostCr,
                planned_duration_months: p.plannedDurationMonths,
                elapsed_months: u.elapsedMonths,
                physical_progress_pct: u.physicalProgressPct,
                financial_progress_pct: u.financialProgressPct,
                expenditure_cr: u.expenditureCr,
                milestones_total: u.milestonesTotal,
                milestones_delayed: u.milestonesDelayed,
                project_status: u.projectStatus,
              })
              const overallRisk = calculateOverallRisk(
                mlRes.cost_overrun.probability,
                mlRes.time_overrun.probability,
                mlRes.cost_overrun.prediction,
                mlRes.time_overrun.prediction
              )
              latestPred = {
                id: `pred_dyn_${p.projectId}`,
                projectId: p.projectId,
                projectUpdateId: u.id,
                costOverrunProbability: mlRes.cost_overrun.probability,
                costPrediction: mlRes.cost_overrun.prediction,
                timeOverrunProbability: mlRes.time_overrun.probability,
                timePrediction: mlRes.time_overrun.prediction,
                costModelVersion: 'Logistic Regression (L2)',
                timeModelVersion: 'Random Forest (150 trees)',
                overallRiskLevel: overallRisk,
                createdAt: new Date(),
              } as any
            } catch {}
          }
        }

        return {
          id: p.id,
          projectId: p.projectId,
          name: p.name,
          ministry: p.ministry,
          sector: p.sector,
          implementingAgency: p.implementingAgency,
          state: p.state,
          originalCostCr: p.originalCostCr,
          plannedDurationMonths: p.plannedDurationMonths,
          status: p.status,
          isSynthetic: p.isSynthetic,
          latestUpdate: p.updates[0] || null,
          latestPrediction: latestPred,
          activeWarningsCount: p.warnings.length,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }
      })

      return {
        total,
        limit,
        offset,
        projects: formatted,
      }
    } catch {
      // Graceful fallback to verified synthetic dataset
      return syntheticDatasetService.getProjects(filters)
    }
  }

  /**
   * Retrieve a single project with full lifecycle history and warnings.
   */
  async getProjectById(projectId: string) {
    try {
      const synth = syntheticDatasetService.getProjectById(projectId)
      const project = await prisma.project.findUnique({
        where: { projectId },
        include: {
          updates: {
            orderBy: { snapshotMonth: 'asc' },
          },
          predictions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          warnings: {
            where: { resolvedAt: null },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (project) {
        // If this is a synthetic baseline project and DB updates are out of sync or missing,
        // or if DB is missing predictions, enrich from the canonical synthetic dataset
        const isOutOfSync =
          project.isSynthetic &&
          synth &&
          (project.updates.length !== synth.updates.length ||
            project.updates.some((u, idx) => u.snapshotMonth !== synth.updates[idx]?.snapshotMonth))

        const sortedUpdates =
          project.isSynthetic && synth && isOutOfSync
            ? synth.updates
            : [...project.updates].sort((a, b) => a.snapshotMonth.localeCompare(b.snapshotMonth))

        const predictions =
          project.predictions.length > 0
            ? project.predictions
            : synth?.latestPrediction
            ? [
                {
                  ...synth.latestPrediction,
                  projectUpdateId: sortedUpdates[sortedUpdates.length - 1]?.id || 'upd_synth',
                },
              ]
            : []

        const rawWarnings =
          project.warnings.length > 0
            ? project.warnings
            : synth?.warnings
            ? synth.warnings.map((w) => ({
                ...w,
                projectUpdateId: sortedUpdates[sortedUpdates.length - 1]?.id || null,
                predictionId: predictions[0]?.id || null,
                resolvedAt: null,
              }))
            : []

        // Deduplicate active warnings by warningType (keeping the latest record per rule)
        const seenRules = new Set<string>()
        const deduplicatedWarnings = []
        for (const w of rawWarnings) {
          if (!seenRules.has(w.warningType)) {
            seenRules.add(w.warningType)
            deduplicatedWarnings.push(w)
          }
        }

        const severityRank: Record<string, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        }
        deduplicatedWarnings.sort(
          (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
        )

        return {
          ...project,
          updates: sortedUpdates,
          predictions,
          warnings: deduplicatedWarnings,
        }
      }

      if (!synth) return null
      return {
        ...synth,
        predictions: synth.latestPrediction ? [synth.latestPrediction] : [],
      }
    } catch {
      const synth = syntheticDatasetService.getProjectById(projectId)
      if (!synth) return null
      return {
        ...synth,
        predictions: synth.latestPrediction ? [synth.latestPrediction] : [],
      }
    }
  }

  /**
   * Retrieve historical snapshots for a project ordered chronologically.
   */
  async getProjectUpdates(projectId: string) {
    try {
      const synth = syntheticDatasetService.getProjectById(projectId)
      const exists = await prisma.project.findUnique({
        where: { projectId },
        select: { id: true, isSynthetic: true },
      })

      if (!exists) {
        return synth ? synth.updates : null
      }

      const dbUpdates = await prisma.projectUpdate.findMany({
        where: { projectId },
        orderBy: { snapshotMonth: 'asc' },
      })

      if (
        exists.isSynthetic &&
        synth &&
        (dbUpdates.length !== synth.updates.length ||
          dbUpdates.some((u, idx) => u.snapshotMonth !== synth.updates[idx]?.snapshotMonth))
      ) {
        return synth.updates
      }

      return [...dbUpdates].sort((a, b) => a.snapshotMonth.localeCompare(b.snapshotMonth))
    } catch {
      const synth = syntheticDatasetService.getProjectById(projectId)
      return synth ? synth.updates : null
    }
  }

  /**
   * Retrieve stored predictions for a project.
   */
  async getProjectPredictions(projectId: string) {
    try {
      const exists = await prisma.project.findUnique({
        where: { projectId },
        select: { id: true },
      })

      if (!exists) {
        const synth = syntheticDatasetService.getProjectById(projectId)
        return synth && synth.latestPrediction ? [synth.latestPrediction] : null
      }

      const dbPreds = await prisma.prediction.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          warnings: true,
        },
      })

      if (dbPreds.length === 0) {
        const synth = syntheticDatasetService.getProjectById(projectId)
        return synth && synth.latestPrediction ? [synth.latestPrediction] : []
      }

      return dbPreds
    } catch {
      const synth = syntheticDatasetService.getProjectById(projectId)
      return synth && synth.latestPrediction ? [synth.latestPrediction] : null
    }
  }

  /**
   * Portfolio Summary for Dashboard KPI cards, risk distribution and early warning feed.
   */
  async getDashboardSummary(filters: { sector?: string; ministry?: string; state?: string } = {}) {
    const cacheKey = JSON.stringify(filters)
    const cached = this.summaryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }

    try {
      const totalBaselineCount = await prisma.project.count()
      if (totalBaselineCount === 0) {
        return syntheticDatasetService.getSummary(filters)
      }

      const where: Prisma.ProjectWhereInput = {}
      if (filters.sector && filters.sector !== 'ALL') {
        where.sector = { equals: filters.sector, mode: 'insensitive' }
      }
      if (filters.ministry && filters.ministry !== 'ALL') {
        where.ministry = { equals: filters.ministry, mode: 'insensitive' }
      }
      if (filters.state && filters.state !== 'ALL') {
        where.state = { equals: filters.state, mode: 'insensitive' }
      }

      const totalProjects = await prisma.project.count({ where })
      if (totalProjects === 0) {
        return syntheticDatasetService.getSummary(filters)
      }

      // Fetch all matching projects for accurate portfolio-wide risk aggregation
      const projects = await prisma.project.findMany({
        where,
        include: {
          updates: { take: 1, orderBy: { snapshotMonth: 'desc' } },
          predictions: { take: 1, orderBy: { createdAt: 'desc' } },
          warnings: { where: { resolvedAt: null }, take: 2, orderBy: { createdAt: 'desc' } },
        },
      })

      const costAgg = await prisma.project.aggregate({
        where,
        _sum: { originalCostCr: true },
      })

      const totalSanctionedCostCr = costAgg._sum.originalCostCr || 0

      // Compute risk counts
      const riskDistribution = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      }

      let totalExpenditureCr = 0
      const attentionProjects: AttentionProjectSummary[] = []
      const recentWarnings: RecentWarningItem[] = []

      for (const p of projects) {
        if (p.updates[0]) {
          totalExpenditureCr += p.updates[0].expenditureCr
        }
        const risk = (p.predictions[0]?.overallRiskLevel || 'LOW').toUpperCase() as keyof typeof riskDistribution
        if (risk in riskDistribution) {
          riskDistribution[risk]++
        }
        if (risk === 'HIGH' || risk === 'CRITICAL') {
          attentionProjects.push({
            id: p.id,
            projectId: p.projectId,
            name: p.name,
            sector: p.sector,
            ministry: p.ministry,
            state: p.state,
            originalCostCr: p.originalCostCr,
            latestUpdate: p.updates[0] || null,
            latestPrediction: p.predictions[0] || null,
          })
        }
        for (const w of p.warnings) {
          recentWarnings.push({
            ...w,
            project: { projectId: p.projectId, sector: p.sector },
          })
        }
      }

      attentionProjects.sort((a, b) => {
        const score = (item: AttentionProjectSummary) => {
          const r = item.latestPrediction?.overallRiskLevel
          const base = r === 'CRITICAL' ? 3 : r === 'HIGH' ? 2 : r === 'MEDIUM' ? 1 : 0
          return base * 10 + (item.latestPrediction?.costOverrunProbability || 0)
        }
        return score(b) - score(a)
      })

      // Distinct filter options safely extracted from projects
      const ministrySet = new Set<string>()
      const sectorSet = new Set<string>()
      const stateSet = new Set<string>()
      for (const p of projects) {
        if (p.ministry) ministrySet.add(p.ministry)
        if (p.sector) sectorSet.add(p.sector)
        if (p.state) stateSet.add(p.state)
      }

      const result = {
        totalProjects,
        highRiskProjects: riskDistribution.HIGH,
        criticalProjects: riskDistribution.CRITICAL,
        mediumRiskProjects: riskDistribution.MEDIUM,
        lowRiskProjects: riskDistribution.LOW,
        totalSanctionedCostCr: Math.round(totalSanctionedCostCr * 100) / 100,
        totalExpenditureCr: Math.round(totalExpenditureCr * 100) / 100,
        riskDistribution,
        attentionProjects: attentionProjects.slice(0, 8),
        recentWarnings: recentWarnings.slice(0, 8),
        filterOptions: {
          ministries: Array.from(ministrySet).sort(),
          sectors: Array.from(sectorSet).sort(),
          states: Array.from(stateSet).sort(),
        },
      }

      this.summaryCache.set(cacheKey, { data: result, expiresAt: Date.now() + 60_000 })
      return result
    } catch {
      return syntheticDatasetService.getSummary(filters)
    }
  }

  /**
   * Retrieve early warning alerts with filtering by severity, type, sector, project, and search query.
   */
  async getAlerts(filters: AlertFilters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
    const offset = Math.max(Number(filters.offset) || 0, 0)

    try {
      const totalProjectsInDb = await prisma.project.count()
      if (totalProjectsInDb === 0) {
        return syntheticDatasetService.getAlerts(filters)
      }

      const where: Prisma.EarlyWarningWhereInput = {
        resolvedAt: null,
      }

      if (filters.severity && filters.severity !== 'ALL') {
        where.severity = { equals: filters.severity.toUpperCase() }
      }

      if (filters.warningType && filters.warningType !== 'ALL') {
        where.warningType = { equals: filters.warningType }
      }

      if (filters.sector && filters.sector !== 'ALL') {
        where.project = {
          sector: { equals: filters.sector, mode: 'insensitive' },
        }
      }

      if (filters.projectId && filters.projectId !== 'ALL') {
        where.projectId = { equals: filters.projectId, mode: 'insensitive' }
      }

      if (filters.search) {
        const q = filters.search.trim()
        where.OR = [
          { projectId: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
          { message: { contains: q, mode: 'insensitive' } },
          {
            project: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { ministry: { contains: q, mode: 'insensitive' } },
                { implementingAgency: { contains: q, mode: 'insensitive' } },
                { state: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        ]
      }

      // Check count
      const total = await prisma.earlyWarning.count({ where })

      // Query paginated alerts with project, projectUpdate, and prediction
      const alerts = await prisma.earlyWarning.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ createdAt: 'desc' }, { projectId: 'asc' }],
        include: {
          project: {
            select: {
              id: true,
              projectId: true,
              name: true,
              sector: true,
              ministry: true,
              implementingAgency: true,
              state: true,
              originalCostCr: true,
              plannedDurationMonths: true,
              status: true,
            },
          },
          projectUpdate: {
            select: {
              snapshotMonth: true,
              elapsedMonths: true,
              physicalProgressPct: true,
              financialProgressPct: true,
              expenditureCr: true,
              milestonesTotal: true,
              milestonesDelayed: true,
              projectStatus: true,
            },
          },
          prediction: {
            select: {
              costOverrunProbability: true,
              costPrediction: true,
              timeOverrunProbability: true,
              timePrediction: true,
              overallRiskLevel: true,
              costModelVersion: true,
              timeModelVersion: true,
            },
          },
        },
      })

      // Query summary counts across all active warnings
      const bySeverityRaw = await prisma.earlyWarning.groupBy({
        by: ['severity'],
        where: { resolvedAt: null },
        _count: { id: true },
      })
      const byTypeRaw = await prisma.earlyWarning.groupBy({
        by: ['warningType'],
        where: { resolvedAt: null },
        _count: { id: true },
      })

      let totalCount = 0
      let criticalCount = 0
      let highCount = 0
      let mediumCount = 0
      let lowCount = 0

      for (const item of bySeverityRaw) {
        const c = item._count.id
        totalCount += c
        const s = item.severity.toUpperCase()
        if (s === 'CRITICAL') criticalCount = c
        else if (s === 'HIGH') highCount = c
        else if (s === 'MEDIUM') mediumCount = c
        else if (s === 'LOW') lowCount = c
      }

      const byType: Record<string, number> = {
        COST_OVERRUN_RISK: 0,
        SCHEDULE_DELAY_RISK: 0,
        CRITICAL_MILESTONE_SLIPPAGE: 0,
        EXPENDITURE_BURN_ANOMALY: 0,
      }
      for (const item of byTypeRaw) {
        byType[item.warningType] = item._count.id
      }

      return {
        total,
        limit,
        offset,
        alerts,
        summary: {
          total: totalCount,
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
          byType,
        },
      }
    } catch {
      return syntheticDatasetService.getAlerts(filters)
    }
  }

  /**
   * Portfolio analytics aggregates covering risk distribution, sector/ministry breakdowns,
   * progress scatter points, and temporal risk trajectory.
   */
  async getAnalyticsData(filters: AnalyticsFilters = {}): Promise<AnalyticsPayload> {
    const cacheKey = JSON.stringify(filters)
    const cached = this.analyticsCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }

    try {
      const totalInDb = await prisma.project.count()
      if (totalInDb === 0) {
        return syntheticDatasetService.getAnalyticsData(filters)
      }

      const dbProjects = await prisma.project.findMany({
        select: {
          id: true,
          projectId: true,
          name: true,
          sector: true,
          ministry: true,
          state: true,
          originalCostCr: true,
          plannedDurationMonths: true,
          updates: {
            orderBy: { snapshotMonth: 'asc' },
            select: {
              snapshotMonth: true,
              physicalProgressPct: true,
              financialProgressPct: true,
              expenditureCr: true,
              elapsedMonths: true,
            },
          },
          predictions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              costOverrunProbability: true,
              timeOverrunProbability: true,
              overallRiskLevel: true,
            },
          },
        },
      })

      const distinctMinistries = new Set<string>()
      const distinctSectors = new Set<string>()
      const distinctStates = new Set<string>()

      for (const p of dbProjects) {
        if (p.ministry) distinctMinistries.add(p.ministry)
        if (p.sector) distinctSectors.add(p.sector)
        if (p.state) distinctStates.add(p.state)
      }

      let filtered = dbProjects

      if (filters.ministry && filters.ministry !== 'ALL') {
        const m = filters.ministry.toLowerCase()
        filtered = filtered.filter((p) => p.ministry.toLowerCase() === m)
      }
      if (filters.sector && filters.sector !== 'ALL') {
        const s = filters.sector.toLowerCase()
        filtered = filtered.filter((p) => p.sector.toLowerCase() === s)
      }
      if (filters.state && filters.state !== 'ALL') {
        const st = filters.state.toLowerCase()
        filtered = filtered.filter((p) => p.state.toLowerCase() === st)
      }
      if (filters.risk && filters.risk !== 'ALL') {
        const r = filters.risk.toUpperCase()
        filtered = filtered.filter(
          (p) => (p.predictions[0]?.overallRiskLevel || 'LOW').toUpperCase() === r
        )
      }

      const totalProjects = filtered.length

      let criticalProjects = 0
      let highRiskProjects = 0
      let mediumRiskProjects = 0
      let lowRiskProjects = 0

      let totalSanctionedCostCr = 0
      let totalExpenditureCr = 0
      let costRiskExposureCr = 0
      let scheduleDelayExposureCount = 0

      const sectorMap = new Map<
        string,
        {
          total: number
          critical: number
          high: number
          medium: number
          low: number
          costProbSum: number
          timeProbSum: number
          costCr: number
          expCr: number
        }
      >()

      const ministryMap = new Map<
        string,
        {
          total: number
          critical: number
          high: number
          medium: number
          low: number
          costProbSum: number
          timeProbSum: number
          costCr: number
        }
      >()

      const stateMap = new Map<
        string,
        {
          total: number
          critical: number
          high: number
          medium: number
          low: number
          costProbSum: number
          timeProbSum: number
          costCr: number
          expCr: number
          physProgressSum: number
          finProgressSum: number
        }
      >()

      const costBuckets: [number, number, number][] = [
        [0.0, 0.2, 0],
        [0.2, 0.4, 0],
        [0.4, 0.6, 0],
        [0.6, 0.8, 0],
        [0.8, 1.0, 0],
      ]

      const timeBuckets: [number, number, number][] = [
        [0.0, 0.2, 0],
        [0.2, 0.4, 0],
        [0.4, 0.6, 0],
        [0.6, 0.8, 0],
        [0.8, 1.0, 0],
      ]

      const scatterPoints: ProgressScatterPoint[] = []

      const monthlyProgressMap = new Map<
        string,
        { physSum: number; finSum: number; count: number; highOrCritical: number }
      >()

      for (const p of filtered) {
        totalSanctionedCostCr += p.originalCostCr
        const latestUpdate = p.updates[p.updates.length - 1] || null
        const latestPred = p.predictions[0] || null

        const risk = (latestPred?.overallRiskLevel || 'LOW').toUpperCase()
        if (risk === 'CRITICAL') criticalProjects++
        else if (risk === 'HIGH') highRiskProjects++
        else if (risk === 'MEDIUM') mediumRiskProjects++
        else lowRiskProjects++

        const costProb = latestPred?.costOverrunProbability ?? 0.25
        const timeProb = latestPred?.timeOverrunProbability ?? 0.25

        if (costProb >= 0.5) costRiskExposureCr += p.originalCostCr
        if (timeProb >= 0.5) scheduleDelayExposureCount++

        const expCr = latestUpdate?.expenditureCr ?? 0
        totalExpenditureCr += expCr

        if (!sectorMap.has(p.sector)) {
          sectorMap.set(p.sector, {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            costProbSum: 0,
            timeProbSum: 0,
            costCr: 0,
            expCr: 0,
          })
        }
        const sEntry = sectorMap.get(p.sector)!
        sEntry.total++
        if (risk === 'CRITICAL') sEntry.critical++
        else if (risk === 'HIGH') sEntry.high++
        else if (risk === 'MEDIUM') sEntry.medium++
        else sEntry.low++
        sEntry.costProbSum += costProb
        sEntry.timeProbSum += timeProb
        sEntry.costCr += p.originalCostCr
        sEntry.expCr += expCr

        if (!ministryMap.has(p.ministry)) {
          ministryMap.set(p.ministry, {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            costProbSum: 0,
            timeProbSum: 0,
            costCr: 0,
          })
        }
        const mEntry = ministryMap.get(p.ministry)!
        mEntry.total++
        if (risk === 'CRITICAL') mEntry.critical++
        else if (risk === 'HIGH') mEntry.high++
        else if (risk === 'MEDIUM') mEntry.medium++
        else mEntry.low++
        mEntry.costProbSum += costProb
        mEntry.timeProbSum += timeProb
        mEntry.costCr += p.originalCostCr

        if (!stateMap.has(p.state)) {
          stateMap.set(p.state, {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            costProbSum: 0,
            timeProbSum: 0,
            costCr: 0,
            expCr: 0,
            physProgressSum: 0,
            finProgressSum: 0,
          })
        }
        const stEntry = stateMap.get(p.state)!
        stEntry.total++
        if (risk === 'CRITICAL') stEntry.critical++
        else if (risk === 'HIGH') stEntry.high++
        else if (risk === 'MEDIUM') stEntry.medium++
        else stEntry.low++
        stEntry.costProbSum += costProb
        stEntry.timeProbSum += timeProb
        stEntry.costCr += p.originalCostCr
        stEntry.expCr += expCr
        stEntry.physProgressSum += (latestUpdate?.physicalProgressPct ?? 0)
        stEntry.finProgressSum += (latestUpdate?.financialProgressPct ?? 0)

        for (const b of costBuckets) {
          if (costProb >= b[0] && (b[1] === 1.0 ? costProb <= b[1] : costProb < b[1])) {
            b[2]++
            break
          }
        }
        for (const b of timeBuckets) {
          if (timeProb >= b[0] && (b[1] === 1.0 ? timeProb <= b[1] : timeProb < b[1])) {
            b[2]++
            break
          }
        }

        const phy = latestUpdate?.physicalProgressPct ?? 0
        const fin = latestUpdate?.financialProgressPct ?? 0
        const sched =
          p.plannedDurationMonths > 0 && latestUpdate
            ? Math.min(150, (latestUpdate.elapsedMonths / p.plannedDurationMonths) * 100)
            : 0

        scatterPoints.push({
          projectId: p.projectId,
          name: p.name,
          sector: p.sector,
          state: p.state,
          originalCostCr: p.originalCostCr,
          physicalProgressPct: phy,
          financialProgressPct: fin,
          scheduleCompletionPct: Math.round(sched * 10) / 10,
          costOverrunProbability: costProb,
          timeOverrunProbability: timeProb,
          overallRiskLevel: risk,
        })

        for (const upd of p.updates) {
          if (!monthlyProgressMap.has(upd.snapshotMonth)) {
            monthlyProgressMap.set(upd.snapshotMonth, {
              physSum: 0,
              finSum: 0,
              count: 0,
              highOrCritical: 0,
            })
          }
          const mItem = monthlyProgressMap.get(upd.snapshotMonth)!
          mItem.physSum += upd.physicalProgressPct
          mItem.finSum += upd.financialProgressPct
          mItem.count++
          if (risk === 'HIGH' || risk === 'CRITICAL') {
            mItem.highOrCritical++
          }
        }
      }

      const bySector: SectorAnalyticsItem[] = Array.from(sectorMap.entries()).map(([sector, d]) => ({
        sector,
        totalProjects: d.total,
        critical: d.critical,
        high: d.high,
        medium: d.medium,
        low: d.low,
        criticalProjects: d.critical,
        highRiskProjects: d.high,
        mediumRiskProjects: d.medium,
        lowRiskProjects: d.low,
        avgCostRisk: Math.round((d.costProbSum / d.total) * 1000) / 1000,
        avgTimeRisk: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
        avgCostOverrunProb: Math.round((d.costProbSum / d.total) * 1000) / 1000,
        avgTimeOverrunProb: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
        totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
        totalCostCr: Math.round(d.costCr * 10) / 10,
        totalExpenditureCr: Math.round(d.expCr * 10) / 10,
        totalExpCr: Math.round(d.expCr * 10) / 10,
      }))

      const byMinistry: MinistryAnalyticsItem[] = Array.from(ministryMap.entries()).map(
        ([ministry, d]) => ({
          ministry,
          totalProjects: d.total,
          critical: d.critical,
          high: d.high,
          medium: d.medium,
          low: d.low,
          criticalProjects: d.critical,
          highRiskProjects: d.high,
          mediumRiskProjects: d.medium,
          lowRiskProjects: d.low,
          avgCostRisk: Math.round((d.costProbSum / d.total) * 1000) / 1000,
          avgTimeRisk: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
          avgCostOverrunProb: Math.round((d.costProbSum / d.total) * 1000) / 1000,
          avgTimeOverrunProb: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
          totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
          totalCostCr: Math.round(d.costCr * 10) / 10,
        })
      )

      const byState: StateAnalyticsItem[] = Array.from(stateMap.entries()).map(([state, d]) => {
        const avgPhy = Math.round((d.physProgressSum / d.total) * 10) / 10
        const avgFin = Math.round((d.finProgressSum / d.total) * 10) / 10
        return {
          state,
          totalProjects: d.total,
          critical: d.critical,
          high: d.high,
          medium: d.medium,
          low: d.low,
          criticalProjects: d.critical,
          highRiskProjects: d.high,
          mediumRiskProjects: d.medium,
          lowRiskProjects: d.low,
          avgCostRisk: Math.round((d.costProbSum / d.total) * 1000) / 1000,
          avgTimeRisk: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
          avgCostOverrunProb: Math.round((d.costProbSum / d.total) * 1000) / 1000,
          avgTimeOverrunProb: Math.round((d.timeProbSum / d.total) * 1000) / 1000,
          totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
          totalCostCr: Math.round(d.costCr * 10) / 10,
          totalExpenditureCr: Math.round(d.expCr * 10) / 10,
          avgPhysicalProgress: avgPhy,
          avgFinancialProgress: avgFin,
          avgBurnGap: Math.round((avgFin - avgPhy) * 10) / 10,
        }
      })

      const bucketLabels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%']
      const costProbabilityBuckets = costBuckets.map((b, idx) => ({
        range: bucketLabels[idx],
        count: b[2],
        percentage: totalProjects > 0 ? Math.round((b[2] / totalProjects) * 1000) / 10 : 0,
      }))

      const timeProbabilityBuckets = timeBuckets.map((b, idx) => ({
        range: bucketLabels[idx],
        count: b[2],
        percentage: totalProjects > 0 ? Math.round((b[2] / totalProjects) * 1000) / 10 : 0,
      }))

      const sortedMonths = Array.from(monthlyProgressMap.keys()).sort()
      const temporalTrend: TemporalTrendPoint[] = sortedMonths.map((m) => {
        const item = monthlyProgressMap.get(m)!
        return {
          snapshotMonth: m,
          avgPhysicalProgressPct: Math.round((item.physSum / item.count) * 10) / 10,
          avgFinancialProgressPct: Math.round((item.finSum / item.count) * 10) / 10,
          totalSnapshots: item.count,
          highOrCriticalCount: item.highOrCritical,
        }
      })

      const highOrCriticalCount = criticalProjects + highRiskProjects
      const highOrCriticalPct =
        totalProjects > 0 ? Math.round((highOrCriticalCount / totalProjects) * 1000) / 10 : 0

      return {
        summary: {
          totalProjects,
          criticalProjects,
          highRiskProjects,
          mediumRiskProjects,
          lowRiskProjects,
          highOrCriticalPct,
          totalSanctionedCostCr: Math.round(totalSanctionedCostCr * 10) / 10,
          totalExpenditureCr: Math.round(totalExpenditureCr * 10) / 10,
          costRiskExposureCr: Math.round(costRiskExposureCr * 10) / 10,
          scheduleDelayExposureCount,
          scheduleDelayExposurePct:
            totalProjects > 0
              ? Math.round((scheduleDelayExposureCount / totalProjects) * 1000) / 10
              : 0,
        },
        riskDistribution: {
          LOW: {
            count: lowRiskProjects,
            percentage: totalProjects > 0 ? Math.round((lowRiskProjects / totalProjects) * 1000) / 10 : 0,
          },
          MEDIUM: {
            count: mediumRiskProjects,
            percentage: totalProjects > 0 ? Math.round((mediumRiskProjects / totalProjects) * 1000) / 10 : 0,
          },
          HIGH: {
            count: highRiskProjects,
            percentage: totalProjects > 0 ? Math.round((highRiskProjects / totalProjects) * 1000) / 10 : 0,
          },
          CRITICAL: {
            count: criticalProjects,
            percentage: totalProjects > 0 ? Math.round((criticalProjects / totalProjects) * 1000) / 10 : 0,
          },
        },
        bySector,
        byMinistry,
        byState,
        scatterPoints,
        costProbabilityBuckets,
        timeProbabilityBuckets,
        temporalTrend,
        filterOptions: {
          ministries: Array.from(distinctMinistries).sort(),
          sectors: Array.from(distinctSectors).sort(),
          states: Array.from(distinctStates).sort(),
        },
        projectList: dbProjects.map((p) => ({
          projectId: p.projectId,
          name: p.name,
          sector: p.sector,
        })),
      }

      this.analyticsCache.set(cacheKey, { data: result, expiresAt: Date.now() + 60_000 })
      return result
    } catch {
      return syntheticDatasetService.getAnalyticsData(filters)
    }
  }

  /**
   * Compare two selected projects side-by-side across key physical, financial, schedule,
   * and ML risk metrics.
   */
  async compareProjects(projectIdA: string, projectIdB: string) {
    try {
      const [projA, projB] = await Promise.all([
        this.getProjectById(projectIdA),
        this.getProjectById(projectIdB),
      ])

      const formatDbProject = (p: Awaited<ReturnType<typeof this.getProjectById>>) => {
        if (!p) return null
        const latestUpdate = p.updates?.[p.updates.length - 1] || null
        const schedComp =
          p.plannedDurationMonths > 0 && latestUpdate
            ? (latestUpdate.elapsedMonths / p.plannedDurationMonths) * 100
            : 0
        const burnGap = latestUpdate
          ? latestUpdate.financialProgressPct - latestUpdate.physicalProgressPct
          : 0
        const milestoneRatio =
          latestUpdate && latestUpdate.milestonesTotal > 0
            ? (latestUpdate.milestonesDelayed / latestUpdate.milestonesTotal) * 100
            : 0
        const latestPred = p.predictions?.[0] || null

        return {
          projectId: p.projectId,
          name: p.name,
          sector: p.sector,
          ministry: p.ministry,
          state: p.state,
          implementingAgency: p.implementingAgency,
          originalCostCr: p.originalCostCr,
          plannedDurationMonths: p.plannedDurationMonths,
          status: p.status,
          physicalProgressPct: latestUpdate ? latestUpdate.physicalProgressPct : 0,
          financialProgressPct: latestUpdate ? latestUpdate.financialProgressPct : 0,
          expenditureCr: latestUpdate ? latestUpdate.expenditureCr : 0,
          elapsedMonths: latestUpdate ? latestUpdate.elapsedMonths : 0,
          scheduleCompletionPct: Math.round(schedComp * 10) / 10,
          burnGap: Math.round(burnGap * 10) / 10,
          milestonesTotal: latestUpdate ? latestUpdate.milestonesTotal : 0,
          milestonesDelayed: latestUpdate ? latestUpdate.milestonesDelayed : 0,
          milestoneSlippageRatio: Math.round(milestoneRatio * 10) / 10,
          costOverrunProbability: latestPred ? latestPred.costOverrunProbability : 0,
          timeOverrunProbability: latestPred ? latestPred.timeOverrunProbability : 0,
          overallRiskLevel: latestPred ? latestPred.overallRiskLevel : 'LOW',
          activeWarningsCount: p.warnings ? p.warnings.length : 0,
        }
      }

      if (projA || projB) {
        return {
          projectA: formatDbProject(projA),
          projectB: formatDbProject(projB),
        }
      }
    } catch {
      // Fallback
    }
    return syntheticDatasetService.compareProjects(projectIdA, projectIdB)
  }
}

export const projectService = new ProjectService()
export default projectService
