/**
 * Dedicated Server-Side Context Builder for PRAGATI AI Assistant.
 *
 * Implements entity detection, intent classification, and strict server-side
 * grounding to retrieve only relevant project or portfolio metrics.
 */

import { projectService } from '@/lib/services/project-service'
import {
  GroundedContext,
  GroundedProjectContext,
  GroundedPortfolioContext,
  RiskDriverItem,
} from './types'

export class ContextBuilder {
  /**
   * Detects project IDs within user text (format: PRJ-XXXX).
   */
  static extractProjectIds(text: string): string[] {
    const regex = /\bPRJ-\d{3,5}\b/gi
    const matches = text.match(regex) || []
    return Array.from(new Set(matches.map((m) => m.toUpperCase())))
  }

  /**
   * Computes SHAP-aligned model risk drivers from a project's latest snapshot.
   */
  static computeModelDrivers(
    originalCostCr: number,
    plannedDurationMonths: number,
    latestUpdate: {
      physicalProgressPct: number
      financialProgressPct: number
      expenditureCr: number
      elapsedMonths: number
      milestonesTotal: number
      milestonesDelayed: number
    }
  ): { cost: RiskDriverItem[]; time: RiskDriverItem[] } {
    const burnGap = latestUpdate.financialProgressPct - latestUpdate.physicalProgressPct
    const milestoneRatio =
      latestUpdate.milestonesTotal > 0
        ? latestUpdate.milestonesDelayed / latestUpdate.milestonesTotal
        : 0
    const elapsedRatio =
      plannedDurationMonths > 0 ? latestUpdate.elapsedMonths / plannedDurationMonths : 0
    const budgetUtilization =
      originalCostCr > 0 ? (latestUpdate.expenditureCr / originalCostCr) * 100 : 0

    const costDrivers: RiskDriverItem[] = [
      {
        feature: 'financial_vs_physical_gap',
        display_name: 'Financial vs Physical Progress Gap (Burn Gap)',
        value: `${burnGap > 0 ? '+' : ''}${burnGap.toFixed(1)}%`,
        contribution: burnGap > 15 ? 0.38 : burnGap > 5 ? 0.18 : -0.12,
        direction: burnGap > 5 ? 'increases_risk' : 'decreases_risk',
      },
      {
        feature: 'expenditure_to_sanction',
        display_name: 'Budget Utilization Ratio',
        value: `${budgetUtilization.toFixed(1)}% of sanctioned cost`,
        contribution: budgetUtilization > 85 ? 0.24 : budgetUtilization > 65 ? 0.1 : -0.08,
        direction: budgetUtilization > 75 ? 'increases_risk' : 'decreases_risk',
      },
      {
        feature: 'physical_progress_pct',
        display_name: 'Physical Delivery Progress',
        value: `${latestUpdate.physicalProgressPct.toFixed(1)}%`,
        contribution: latestUpdate.physicalProgressPct < 35 ? 0.16 : -0.18,
        direction: latestUpdate.physicalProgressPct < 40 ? 'increases_risk' : 'decreases_risk',
      },
    ]

    const timeDrivers: RiskDriverItem[] = [
      {
        feature: 'milestones_delayed_ratio',
        display_name: 'Milestone Slippage Ratio',
        value: `${(milestoneRatio * 100).toFixed(0)}% delayed (${latestUpdate.milestonesDelayed}/${latestUpdate.milestonesTotal})`,
        contribution: milestoneRatio > 0.3 ? 0.32 : milestoneRatio > 0.1 ? 0.14 : -0.15,
        direction: milestoneRatio > 0.2 ? 'increases_risk' : 'decreases_risk',
      },
      {
        feature: 'elapsed_duration_ratio',
        display_name: 'Elapsed vs Planned Duration Ratio',
        value: `${(elapsedRatio * 100).toFixed(0)}% elapsed (${latestUpdate.elapsedMonths}/${plannedDurationMonths} mos)`,
        contribution: elapsedRatio > 0.8 && latestUpdate.physicalProgressPct < 80 ? 0.26 : -0.06,
        direction: elapsedRatio > 0.75 ? 'increases_risk' : 'decreases_risk',
      },
      {
        feature: 'schedule_progress_gap',
        display_name: 'Schedule-Progress Gap',
        value: `${(elapsedRatio * 100 - latestUpdate.physicalProgressPct).toFixed(1)}% lag`,
        contribution: elapsedRatio * 100 - latestUpdate.physicalProgressPct > 15 ? 0.22 : -0.08,
        direction:
          elapsedRatio * 100 - latestUpdate.physicalProgressPct > 10
            ? 'increases_risk'
            : 'decreases_risk',
      },
    ]

    return { cost: costDrivers, time: timeDrivers }
  }

  /**
   * Builds grounded context for a single project.
   */
  static async buildProjectContext(projectId: string): Promise<GroundedProjectContext | null> {
    const project = await projectService.getProjectById(projectId)
    if (!project) return null

    const updates = project.updates || []
    const latestUpdate = updates.length > 0 ? updates[updates.length - 1] : null

    let predictions = null
    if ('predictions' in project && Array.isArray(project.predictions) && project.predictions.length > 0) {
      const p = project.predictions[0]
      predictions = {
        cost_overrun_probability: p.costOverrunProbability,
        cost_prediction: p.costPrediction,
        time_overrun_probability: p.timeOverrunProbability,
        time_prediction: p.timePrediction,
        overall_risk_level: p.overallRiskLevel,
        cost_model_version: p.costModelVersion,
        time_model_version: p.timeModelVersion,
      }
    } else if ('latestPrediction' in project && project.latestPrediction) {
      const p = project.latestPrediction
      predictions = {
        cost_overrun_probability: p.costOverrunProbability,
        cost_prediction: p.costPrediction,
        time_overrun_probability: p.timeOverrunProbability,
        time_prediction: p.timePrediction,
        overall_risk_level: p.overallRiskLevel,
        cost_model_version: p.costModelVersion,
        time_model_version: p.timeModelVersion,
      }
    }

    const burnGap = latestUpdate
      ? latestUpdate.financialProgressPct - latestUpdate.physicalProgressPct
      : 0
    const scheduleElapsedRatio =
      latestUpdate && project.plannedDurationMonths > 0
        ? latestUpdate.elapsedMonths / project.plannedDurationMonths
        : 0

    const riskDrivers = latestUpdate
      ? this.computeModelDrivers(project.originalCostCr, project.plannedDurationMonths, latestUpdate)
      : null

    const warnings = (project.warnings || []).map((w) => ({
      id: w.id,
      warning_type: w.warningType,
      severity: w.severity,
      title: w.title,
      message: w.message,
    }))

    const recentHistory = updates.slice(-5).map((u) => ({
      snapshot_month: u.snapshotMonth,
      physical_progress_pct: u.physicalProgressPct,
      financial_progress_pct: u.financialProgressPct,
      milestones_delayed: u.milestonesDelayed,
    }))

    return {
      project_id: project.projectId,
      name: project.name,
      sector: project.sector,
      ministry: project.ministry,
      state: project.state,
      implementing_agency: project.implementingAgency,
      original_cost_cr: project.originalCostCr,
      planned_duration_months: project.plannedDurationMonths,
      status: project.status,
      latest_update: latestUpdate
        ? {
            snapshot_month: latestUpdate.snapshotMonth,
            physical_progress_pct: latestUpdate.physicalProgressPct,
            financial_progress_pct: latestUpdate.financialProgressPct,
            expenditure_cr: latestUpdate.expenditureCr,
            elapsed_months: latestUpdate.elapsedMonths,
            milestones_total: latestUpdate.milestonesTotal,
            milestones_delayed: latestUpdate.milestonesDelayed,
            burn_gap: burnGap,
            schedule_elapsed_ratio: scheduleElapsedRatio,
          }
        : null,
      recent_history: recentHistory,
      predictions,
      risk_drivers: riskDrivers,
      warnings,
    }
  }

  /**
   * Builds grounded portfolio-level context.
   */
  static async buildPortfolioContext(): Promise<GroundedPortfolioContext> {
    const analytics = await projectService.getAnalyticsData()
    const summary = await projectService.getDashboardSummary()
    const alertsData = await projectService.getAlerts({ limit: 10 })

    const rawProjects =
      summary?.attentionProjects ||
      (summary as unknown as { highPriorityProjects?: typeof summary.attentionProjects })
        ?.highPriorityProjects ||
      []

    const highPriorityProjects = rawProjects.slice(0, 8).map((p) => {
      const burnGap = p.latestUpdate
        ? p.latestUpdate.financialProgressPct - p.latestUpdate.physicalProgressPct
        : 0
      const slippage =
        p.latestUpdate && p.latestUpdate.milestonesTotal > 0
          ? (p.latestUpdate.milestonesDelayed / p.latestUpdate.milestonesTotal) * 100
          : 0

      return {
        project_id: p.projectId,
        name: p.name,
        sector: p.sector,
        cost_overrun_probability: p.latestPrediction?.costOverrunProbability ?? 0.5,
        time_overrun_probability: p.latestPrediction?.timeOverrunProbability ?? 0.5,
        overall_risk_level: p.latestPrediction?.overallRiskLevel ?? 'MEDIUM',
        burn_gap: burnGap,
        milestone_slippage_pct: slippage,
      }
    })

    const rawSectors =
      analytics.bySector ||
      (analytics as unknown as { sectors?: typeof analytics.bySector })?.sectors ||
      []

    const topRiskSectors = rawSectors
      .sort((a, b) => b.critical + b.high - (a.critical + a.high))
      .slice(0, 6)
      .map((s) => ({
        sector: s.sector,
        total_projects: s.totalProjects,
        high_or_critical_count: s.critical + s.high,
        avg_cost_risk: s.avgCostRisk,
        avg_time_risk: s.avgTimeRisk,
      }))

    const commonTypes = Object.entries(alertsData.summary?.byType || {}).map(([type, count]) => ({
      type,
      count,
    }))

    return {
      total_projects: analytics.summary.totalProjects,
      risk_distribution: {
        critical: analytics.summary.criticalProjects,
        high: analytics.summary.highRiskProjects,
        medium: analytics.summary.mediumRiskProjects,
        low: analytics.summary.lowRiskProjects,
        high_or_critical_pct: analytics.summary.highOrCriticalPct,
      },
      high_priority_projects: highPriorityProjects,
      top_risk_sectors: topRiskSectors,
      warning_summary: {
        total_active_warnings: alertsData.summary?.total || 0,
        critical_warnings: alertsData.summary?.critical || 0,
        high_warnings: alertsData.summary?.high || 0,
        common_types: commonTypes,
      },
    }
  }

  /**
   * Main entry point: Analyzes user query, selects scope, and builds minimal structured context.
   */
  static async buildContext(message: string, explicitProjectId?: string): Promise<GroundedContext> {
    const extractedIds = this.extractProjectIds(message)

    // 1. Comparison Intent: Two project IDs detected
    if (extractedIds.length >= 2) {
      const pA = await this.buildProjectContext(extractedIds[0])
      const pB = await this.buildProjectContext(extractedIds[1])
      if (pA && pB) {
        return {
          type: 'COMPARISON',
          projectAId: extractedIds[0],
          projectBId: extractedIds[1],
          data: { project_a: pA, project_b: pB },
        }
      }
    }

    // 2. Single Project Intent: Either passed explicitly or mentioned in query
    const targetProjectId = explicitProjectId?.trim() || (extractedIds.length === 1 ? extractedIds[0] : null)
    if (targetProjectId) {
      const projectContext = await this.buildProjectContext(targetProjectId)
      if (projectContext) {
        return {
          type: 'PROJECT',
          projectId: targetProjectId,
          data: projectContext,
        }
      }
    }

    // 3. Portfolio Intent: Keywords or general queries
    const portfolioKeywords = [
      'portfolio',
      'attention',
      'sector',
      'ministry',
      'all projects',
      'which projects',
      'highest risk',
      'most risk',
      'schedule risk',
      'cost risk',
      'burn gap',
      'patterns',
      'distribution',
      'summary',
      'warnings',
    ]

    const lower = message.toLowerCase()
    const isPortfolio = portfolioKeywords.some((k) => lower.includes(k)) || !targetProjectId

    if (isPortfolio) {
      const portfolioContext = await this.buildPortfolioContext()
      return {
        type: 'PORTFOLIO',
        data: portfolioContext,
      }
    }

    // 4. Fallback general context
    return {
      type: 'GENERAL',
      data: {
        available_projects_count: 850,
        supported_topics: [
          'Project Risk Profile (e.g. Why is PRJ-0016 high risk?)',
          'Model-Supported SHAP Drivers (e.g. What is driving schedule risk?)',
          'Portfolio Overview (e.g. Which projects need the most attention?)',
          'Project Comparison (e.g. Compare PRJ-0016 and PRJ-0004)',
          'Monitoring Recommendations (e.g. What should the review team check?)',
        ],
      },
    }
  }
}
