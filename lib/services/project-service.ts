/**
 * Project Data Access Service.
 *
 * Encapsulates all database operations for projects and their monitoring snapshots.
 * Provides automatic fallback to the verified synthetic dataset when PostgreSQL is
 * unseeded or offline.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { syntheticDatasetService } from './synthetic-dataset'

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

export class ProjectService {
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

      const total = await prisma.project.count({ where })

      if (total === 0 && !filters.query && !filters.sector && !filters.ministry) {
        // Database is empty, fall back to synthetic dataset
        return syntheticDatasetService.getProjects(filters)
      }

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

      const formatted = projects.map((p) => ({
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
        latestPrediction: p.predictions[0] || null,
        activeWarningsCount: p.warnings.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))

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
        return project
      }

      return syntheticDatasetService.getProjectById(projectId)
    } catch {
      return syntheticDatasetService.getProjectById(projectId)
    }
  }

  /**
   * Retrieve historical snapshots for a project ordered chronologically.
   */
  async getProjectUpdates(projectId: string) {
    try {
      const exists = await prisma.project.findUnique({
        where: { projectId },
        select: { id: true },
      })

      if (!exists) {
        const synth = syntheticDatasetService.getProjectById(projectId)
        return synth ? synth.updates : null
      }

      return await prisma.projectUpdate.findMany({
        where: { projectId },
        orderBy: { snapshotMonth: 'asc' },
      })
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

      return await prisma.prediction.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          warnings: true,
        },
      })
    } catch {
      const synth = syntheticDatasetService.getProjectById(projectId)
      return synth && synth.latestPrediction ? [synth.latestPrediction] : null
    }
  }

  /**
   * Portfolio Summary for Dashboard KPI cards, risk distribution and early warning feed.
   */
  async getDashboardSummary(filters: { sector?: string; ministry?: string; state?: string } = {}) {
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

      const totalProjects = await prisma.project.count({ where })
      if (totalProjects === 0) {
        return syntheticDatasetService.getSummary(filters)
      }

      // Fetch sample for aggregations
      const projects = await prisma.project.findMany({
        where,
        take: 100,
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
      const attentionProjects: any[] = []
      const recentWarnings: any[] = []

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

      // Distinct filter options
      const [ministriesRaw, sectorsRaw, statesRaw] = await Promise.all([
        prisma.project.findMany({ select: { ministry: true }, distinct: ['ministry'] }),
        prisma.project.findMany({ select: { sector: true }, distinct: ['sector'] }),
        prisma.project.findMany({ select: { state: true }, distinct: ['state'] }),
      ])

      return {
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
          ministries: ministriesRaw.map((m) => m.ministry).sort(),
          sectors: sectorsRaw.map((s) => s.sector).sort(),
          states: statesRaw.map((s) => s.state).sort(),
        },
      }
    } catch {
      return syntheticDatasetService.getSummary(filters)
    }
  }
}

export const projectService = new ProjectService()
export default projectService
