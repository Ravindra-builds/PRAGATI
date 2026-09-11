/**
 * Project Data Access Service.
 *
 * Encapsulates all database operations for projects and their monitoring snapshots.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface ProjectFilters {
  sector?: string
  ministry?: string
  state?: string
  status?: string
  risk?: string
  limit?: number
  offset?: number
}

export class ProjectService {
  /**
   * List projects with basic filters and pagination.
   * Includes the latest snapshot and latest prediction summary.
   */
  async getProjects(filters: ProjectFilters = {}) {
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
    const offset = Math.max(Number(filters.offset) || 0, 0)

    const where: Prisma.ProjectWhereInput = {}

    if (filters.sector) {
      where.sector = { equals: filters.sector, mode: 'insensitive' }
    }
    if (filters.ministry) {
      where.ministry = { equals: filters.ministry, mode: 'insensitive' }
    }
    if (filters.state) {
      where.state = { equals: filters.state, mode: 'insensitive' }
    }
    if (filters.status) {
      where.status = { equals: filters.status, mode: 'insensitive' }
    }
    if (filters.risk) {
      where.predictions = {
        some: {
          overallRiskLevel: { equals: filters.risk, mode: 'insensitive' },
        },
      }
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
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
      }),
    ])

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
  }

  /**
   * Retrieve a single project with full lifecycle history and warnings.
   */
  async getProjectById(projectId: string) {
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

    return project
  }

  /**
   * Retrieve historical snapshots for a project ordered chronologically.
   */
  async getProjectUpdates(projectId: string) {
    // Check project existence
    const exists = await prisma.project.findUnique({
      where: { projectId },
      select: { id: true },
    })

    if (!exists) {
      return null
    }

    return prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { snapshotMonth: 'asc' },
    })
  }

  /**
   * Retrieve stored predictions for a project.
   */
  async getProjectPredictions(projectId: string) {
    const exists = await prisma.project.findUnique({
      where: { projectId },
      select: { id: true },
    })

    if (!exists) {
      return null
    }

    return prisma.prediction.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        warnings: true,
      },
    })
  }
}

export const projectService = new ProjectService()
export default projectService
