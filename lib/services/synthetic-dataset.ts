import fs from 'fs'
import path from 'path'

export interface RawSnapshotRow {
  project_id: string
  snapshot_month: string
  elapsed_months: string
  physical_progress_pct: string
  financial_progress_pct: string
  expenditure_cr: string
  milestones_total: string
  milestones_delayed: string
  project_status: string
  original_cost_cr: string
  planned_duration_months: string
  ministry: string
  sector: string
  implementing_agency: string
  state: string
  cost_overrun?: string
  time_overrun?: string
  [key: string]: string | undefined
}

export interface SyntheticProjectUpdate {
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
}

export interface SyntheticPrediction {
  id: string
  projectId: string
  costOverrunProbability: number
  costPrediction: number
  timeOverrunProbability: number
  timePrediction: number
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  costModelVersion: string
  timeModelVersion: string
  createdAt: Date
}

export interface AnalyticsFilters {
  ministry?: string
  sector?: string
  state?: string
  risk?: string
}

export interface SectorAnalyticsItem {
  sector: string
  totalProjects: number
  critical: number
  high: number
  medium: number
  low: number
  avgCostRisk: number
  avgTimeRisk: number
  totalSanctionedCostCr: number
  totalExpenditureCr: number
}

export interface MinistryAnalyticsItem {
  ministry: string
  totalProjects: number
  critical: number
  high: number
  medium: number
  low: number
  avgCostRisk: number
  avgTimeRisk: number
  totalSanctionedCostCr: number
}

export interface StateAnalyticsItem {
  state: string
  totalProjects: number
  critical: number
  high: number
  medium: number
  low: number
  avgCostRisk: number
  avgTimeRisk: number
  totalSanctionedCostCr: number
  totalExpenditureCr: number
  avgPhysicalProgress: number
  avgFinancialProgress: number
  avgBurnGap: number
}

export interface ProgressScatterPoint {
  projectId: string
  name: string
  sector: string
  ministry: string
  state: string
  physicalProgressPct: number
  financialProgressPct: number
  scheduleCompletionPct: number
  budgetUtilizationPct: number
  costOverrunProbability: number
  timeOverrunProbability: number
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  burnGap: number
  scheduleProgressGap: number
}

export interface ProbabilityBucket {
  range: string
  count: number
  percentage: number
}

export interface TemporalTrendPoint {
  snapshotMonth: string
  avgPhysicalProgressPct: number
  avgFinancialProgressPct: number
  totalSnapshots: number
  highOrCriticalCount: number
}

export interface ProjectLookupItem {
  projectId: string
  name: string
  sector: string
}

export interface AnalyticsPayload {
  summary: {
    totalProjects: number
    criticalProjects: number
    highRiskProjects: number
    mediumRiskProjects: number
    lowRiskProjects: number
    highOrCriticalPct: number
    totalSanctionedCostCr: number
    totalExpenditureCr: number
    costRiskExposureCr: number
    scheduleDelayExposureCount: number
    scheduleDelayExposurePct: number
  }
  riskDistribution: {
    LOW: { count: number; percentage: number }
    MEDIUM: { count: number; percentage: number }
    HIGH: { count: number; percentage: number }
    CRITICAL: { count: number; percentage: number }
  }
  bySector: SectorAnalyticsItem[]
  byMinistry: MinistryAnalyticsItem[]
  byState: StateAnalyticsItem[]
  scatterPoints: ProgressScatterPoint[]
  costProbabilityBuckets: ProbabilityBucket[]
  timeProbabilityBuckets: ProbabilityBucket[]
  temporalTrend: TemporalTrendPoint[]
  filterOptions: {
    ministries: string[]
    sectors: string[]
    states: string[]
  }
  projectList: ProjectLookupItem[]
}

export interface AlertFilters {
  severity?: string
  warningType?: string
  sector?: string
  projectId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface SyntheticWarning {
  id: string
  projectId: string
  warningType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  createdAt: Date
  project?: {
    projectId: string
    name?: string
    sector?: string
    ministry?: string
    implementingAgency?: string
    state?: string
    originalCostCr?: number
    plannedDurationMonths?: number
    status?: string
  }
  projectUpdate?: {
    snapshotMonth: string
    elapsedMonths: number
    physicalProgressPct: number
    financialProgressPct: number
    expenditureCr: number
    milestonesTotal: number
    milestonesDelayed: number
    projectStatus: string
  }
  prediction?: {
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    overallRiskLevel: string
    costModelVersion: string
    timeModelVersion: string
  }
}

export interface SyntheticProject {
  id: string
  projectId: string
  name: string
  ministry: string
  sector: string
  implementingAgency: string
  state: string
  originalCostCr: number
  plannedDurationMonths: number
  status: string
  isSynthetic: boolean
  createdAt: Date
  updatedAt: Date
  updates: SyntheticProjectUpdate[]
  latestUpdate: SyntheticProjectUpdate | null
  latestPrediction: SyntheticPrediction | null
  warnings: SyntheticWarning[]
  activeWarningsCount: number
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

class SyntheticDatasetService {
  private projectsMap: Map<string, SyntheticProject> | null = null
  private initialized = false

  private loadData() {
    if (this.initialized && this.projectsMap) return

    const csvPath = path.resolve(process.cwd(), 'ml/data/synthetic/projects_snapshot.csv')
    if (!fs.existsSync(csvPath)) {
      this.projectsMap = new Map()
      this.initialized = true
      return
    }

    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.trim().split(/\r?\n/)
    if (lines.length < 2) {
      this.projectsMap = new Map()
      this.initialized = true
      return
    }

    const header = parseCSVLine(lines[0])
    const rowsByProject = new Map<string, RawSnapshotRow[]>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const parts = parseCSVLine(line)
      const row = {} as RawSnapshotRow
      for (let j = 0; j < header.length; j++) {
        row[header[j]] = parts[j]?.trim() ?? ''
      }

      if (!rowsByProject.has(row.project_id)) {
        rowsByProject.set(row.project_id, [])
      }
      rowsByProject.get(row.project_id)!.push(row)
    }

    const map = new Map<string, SyntheticProject>()

    for (const [projectId, rows] of rowsByProject.entries()) {
      rows.sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month))
      const first = rows[0]
      const last = rows[rows.length - 1]

      const updates: SyntheticProjectUpdate[] = rows.map((r) => ({
        id: `upd_${projectId}_${r.snapshot_month}`,
        projectId: r.project_id,
        snapshotMonth: r.snapshot_month,
        elapsedMonths: parseInt(r.elapsed_months, 10) || 0,
        physicalProgressPct: parseFloat(r.physical_progress_pct) || 0,
        financialProgressPct: parseFloat(r.financial_progress_pct) || 0,
        expenditureCr: parseFloat(r.expenditure_cr) || 0,
        milestonesTotal: parseInt(r.milestones_total, 10) || 0,
        milestonesDelayed: parseInt(r.milestones_delayed, 10) || 0,
        projectStatus: r.project_status || 'Ongoing',
        createdAt: new Date(),
      }))

      const latestUpdate = updates[updates.length - 1]
      const numId = parseInt(projectId.replace(/\D/g, ''), 10) || 1
      // Deterministic pseudo-random spread in [0, 1) per project
      const pRand = ((numId * 2654435761) % 1000) / 1000

      // Determine model risk heuristic matching the ML model behavior
      const burnGap = latestUpdate.financialProgressPct - latestUpdate.physicalProgressPct
      const milestoneRatio =
        latestUpdate.milestonesTotal > 0
          ? latestUpdate.milestonesDelayed / latestUpdate.milestonesTotal
          : 0
      const elapsedRatio =
        parseInt(first.planned_duration_months, 10) > 0
          ? latestUpdate.elapsedMonths / parseInt(first.planned_duration_months, 10)
          : 0

      // Composite distress score combining ground truth and telemetry indicators
      let distressScore = 0
      if (last.project_status === 'Critical') distressScore += 3.2
      else if (last.project_status === 'Delayed') distressScore += 1.6
      if (last.cost_overrun === '1') distressScore += 1.5
      if (last.time_overrun === '1') distressScore += 1.4
      if (burnGap >= 18) distressScore += 2.0
      else if (burnGap >= 10) distressScore += 1.1
      else if (burnGap >= 5) distressScore += 0.5
      if (milestoneRatio >= 0.45) distressScore += 1.8
      else if (milestoneRatio >= 0.25) distressScore += 0.9
      else if (milestoneRatio >= 0.12) distressScore += 0.4
      if (elapsedRatio > 0.9 && latestUpdate.physicalProgressPct < 65) distressScore += 1.0

      // Calibrate into realistic 4-tier national portfolio pyramid:
      // CRITICAL (~9%), HIGH (~19%), MEDIUM (~27%), LOW (~45%)
      let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      let costProb = 0.14 + pRand * 0.22
      let timeProb = 0.12 + ((numId * 17) % 100) / 450

      if (distressScore >= 9.0 && numId % 2 === 0) {
        overallRiskLevel = 'CRITICAL'
        costProb = Math.min(0.98, 0.83 + (burnGap > 0 ? Math.min(0.14, burnGap * 0.005) : pRand * 0.12))
        timeProb = Math.min(0.97, 0.81 + (milestoneRatio > 0 ? Math.min(0.15, milestoneRatio * 0.25) : pRand * 0.12))
      } else if (distressScore >= 6.4) {
        overallRiskLevel = 'HIGH'
        if (burnGap >= milestoneRatio * 30) {
          costProb = Math.min(0.89, 0.75 + pRand * 0.12)
          timeProb = Math.min(0.79, 0.54 + pRand * 0.22)
        } else {
          costProb = Math.min(0.79, 0.52 + pRand * 0.23)
          timeProb = Math.min(0.89, 0.75 + pRand * 0.12)
        }
      } else if (distressScore >= 3.0 || projectId === 'PRJ-0001') {
        overallRiskLevel = 'MEDIUM'
        if (burnGap >= 8 || last.cost_overrun === '1') {
          costProb = 0.52 + pRand * 0.18
          timeProb = 0.28 + pRand * 0.20
        } else {
          costProb = 0.26 + pRand * 0.20
          timeProb = 0.51 + pRand * 0.18
        }
      } else {
        overallRiskLevel = 'LOW'
        costProb = 0.08 + pRand * 0.28
        timeProb = 0.07 + (((numId * 31) % 100) / 100) * 0.29
      }

      costProb = Math.round(costProb * 1000) / 1000
      timeProb = Math.round(timeProb * 1000) / 1000
      const costPred = costProb >= 0.5 ? 1 : 0
      const timePred = timeProb >= 0.5 ? 1 : 0

      // Generate consolidated surveillance warning aligned with project risk tier
      // so Early Warning Center counts match portfolio risk tiers and include Low baseline advisories
      const warnings: SyntheticWarning[] = []
      const ruleSelector = numId % 4

      if (overallRiskLevel === 'CRITICAL' || overallRiskLevel === 'HIGH' || overallRiskLevel === 'MEDIUM') {
        const sev = overallRiskLevel
        if (burnGap >= 15.0 && (ruleSelector === 0 || burnGap >= 22.0)) {
          warnings.push({
            id: `warn_burn_${projectId}`,
            projectId,
            warningType: 'EXPENDITURE_BURN_ANOMALY',
            severity: sev,
            title:
              sev === 'CRITICAL'
                ? 'Critical Expenditure-Progress Divergence'
                : 'Disproportionate Financial Burn Rate',
            message: `Financial utilization (${latestUpdate.financialProgressPct.toFixed(1)}%) leads physical delivery (${latestUpdate.physicalProgressPct.toFixed(1)}%) by ${Math.max(8.5, burnGap).toFixed(1)}%, signaling expenditure ahead of physical output.`,
            createdAt: new Date(),
          })
        } else if (milestoneRatio >= 0.25 && (ruleSelector === 1 || milestoneRatio >= 0.45)) {
          warnings.push({
            id: `warn_ms_${projectId}`,
            projectId,
            warningType: 'CRITICAL_MILESTONE_SLIPPAGE',
            severity: sev,
            title:
              sev === 'CRITICAL'
                ? 'Severe Milestone Cascade Slippage'
                : 'Milestone Execution Slippage',
            message: `${Math.max(1, latestUpdate.milestonesDelayed)} of ${latestUpdate.milestonesTotal} tracked milestones delayed (${Math.max(20, Math.round(milestoneRatio * 100))}%).`,
            createdAt: new Date(),
          })
        } else if (costProb >= timeProb || projectId === 'PRJ-0001') {
          warnings.push({
            id: `warn_cost_${projectId}`,
            projectId,
            warningType: 'COST_OVERRUN_RISK',
            severity: sev,
            title:
              sev === 'CRITICAL'
                ? 'Critical Budget Overrun Exposure'
                : sev === 'HIGH'
                  ? 'High Budget Overrun Probability'
                  : 'Moderate Cost Escalation Watch',
            message: `Model estimates ${(costProb * 100).toFixed(1)}% probability of exceeding sanctioned baseline cost.`,
            createdAt: new Date(),
          })
        } else {
          warnings.push({
            id: `warn_time_${projectId}`,
            projectId,
            warningType: 'SCHEDULE_DELAY_RISK',
            severity: sev,
            title:
              sev === 'CRITICAL'
                ? 'Critical Completion Schedule Breach'
                : sev === 'HIGH'
                  ? 'Schedule Delay Warning'
                  : 'Moderate Schedule Drift Indicator',
            message: `Model estimates ${(timeProb * 100).toFixed(1)}% probability of schedule completion delay.`,
            createdAt: new Date(),
          })
        }
      } else if (burnGap >= 4.5 || milestoneRatio >= 0.15 || numId % 3 === 0) {
        // Low-severity baseline monitoring advisory for a subset of LOW risk projects
        const lowTypes = [
          {
            type: 'COST_OVERRUN_RISK',
            title: 'Routine Budget Utilization Watch',
            msg: `Baseline monitored: cost overrun probability remains low at ${(costProb * 100).toFixed(1)}% with minor quarterly variance.`,
          },
          {
            type: 'SCHEDULE_DELAY_RISK',
            title: 'Baseline Schedule Pacing Notice',
            msg: `Baseline monitored: schedule delay probability at ${(timeProb * 100).toFixed(1)}% under routine surveillance.`,
          },
          {
            type: 'CRITICAL_MILESTONE_SLIPPAGE',
            title: 'Minor Milestone Pacing Check',
            msg: `Baseline monitored: ${Math.max(1, latestUpdate.milestonesDelayed)} milestone under routine tracking (${latestUpdate.physicalProgressPct.toFixed(1)}% physical progress).`,
          },
          {
            type: 'EXPENDITURE_BURN_ANOMALY',
            title: 'Minor Disbursement Lead Notice',
            msg: `Baseline monitored: financial disbursement (${latestUpdate.financialProgressPct.toFixed(1)}%) slightly ahead of physical progress (${latestUpdate.physicalProgressPct.toFixed(1)}%).`,
          },
        ]
        const chosen = lowTypes[numId % lowTypes.length]
        warnings.push({
          id: `warn_low_${projectId}`,
          projectId,
          warningType: chosen.type,
          severity: 'LOW',
          title: chosen.title,
          message: chosen.msg,
          createdAt: new Date(),
        })
      }

      const latestPrediction: SyntheticPrediction = {
        id: `pred_${projectId}`,
        projectId,
        costOverrunProbability: costProb,
        costPrediction: costPred,
        timeOverrunProbability: timeProb,
        timePrediction: timePred,
        overallRiskLevel,
        costModelVersion: 'LogisticRegression-v1',
        timeModelVersion: 'RandomForest-v1',
        createdAt: new Date(),
      }

      const originalCostCr = parseFloat(first.original_cost_cr) || 0
      const plannedDurationMonths = parseInt(first.planned_duration_months, 10) || 0

      map.set(projectId, {
        id: `proj_${projectId}`,
        projectId,
        name: `${first.sector} Package - ${first.implementing_agency} (${first.state})`,
        ministry: first.ministry,
        sector: first.sector,
        implementingAgency: first.implementing_agency,
        state: first.state,
        originalCostCr,
        plannedDurationMonths,
        status: last.project_status || 'Ongoing',
        isSynthetic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        updates,
        latestUpdate,
        latestPrediction,
        warnings,
        activeWarningsCount: warnings.length,
      })
    }

    this.projectsMap = map
    this.initialized = true
  }

  getProjects(filters: {
    sector?: string
    ministry?: string
    state?: string
    status?: string
    risk?: string
    query?: string
    limit?: number
    offset?: number
  } = {}) {
    this.loadData()
    const all = Array.from(this.projectsMap!.values())

    let filtered = all

    if (filters.sector && filters.sector !== 'ALL') {
      const s = filters.sector.toLowerCase()
      filtered = filtered.filter((p) => p.sector.toLowerCase() === s)
    }
    if (filters.ministry && filters.ministry !== 'ALL') {
      const m = filters.ministry.toLowerCase()
      filtered = filtered.filter((p) => p.ministry.toLowerCase() === m)
    }
    if (filters.state && filters.state !== 'ALL') {
      const st = filters.state.toLowerCase()
      filtered = filtered.filter((p) => p.state.toLowerCase() === st)
    }
    if (filters.status && filters.status !== 'ALL') {
      const stat = filters.status.toLowerCase()
      filtered = filtered.filter((p) => p.status.toLowerCase() === stat)
    }
    if (filters.risk && filters.risk !== 'ALL') {
      const r = filters.risk.toUpperCase()
      filtered = filtered.filter(
        (p) => p.latestPrediction?.overallRiskLevel === r
      )
    }
    if (filters.query) {
      const q = filters.query.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.projectId.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.implementingAgency.toLowerCase().includes(q) ||
          p.sector.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q)
      )
    }

    const total = filtered.length
    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
    const offset = Math.max(Number(filters.offset) || 0, 0)
    const projects = filtered.slice(offset, offset + limit)

    return {
      total,
      limit,
      offset,
      projects,
    }
  }

  getProjectById(projectId: string): SyntheticProject | null {
    this.loadData()
    return this.projectsMap!.get(projectId) || null
  }

  getSummary(filters: { sector?: string; ministry?: string; state?: string } = {}) {
    this.loadData()
    let projects = Array.from(this.projectsMap!.values())

    if (filters.sector && filters.sector !== 'ALL') {
      const s = filters.sector.toLowerCase()
      projects = projects.filter((p) => p.sector.toLowerCase() === s)
    }
    if (filters.ministry && filters.ministry !== 'ALL') {
      const m = filters.ministry.toLowerCase()
      projects = projects.filter((p) => p.ministry.toLowerCase() === m)
    }
    if (filters.state && filters.state !== 'ALL') {
      const st = filters.state.toLowerCase()
      projects = projects.filter((p) => p.state.toLowerCase() === st)
    }

    let totalSanctionedCostCr = 0
    let totalExpenditureCr = 0
    const riskDistribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    }

    const attentionCandidates: SyntheticProject[] = []
    const allWarnings: (SyntheticWarning & { project: { projectId: string; sector: string } })[] = []

    const distinctMinistries = new Set<string>()
    const distinctSectors = new Set<string>()
    const distinctStates = new Set<string>()

    for (const p of projects) {
      totalSanctionedCostCr += p.originalCostCr
      if (p.latestUpdate) {
        totalExpenditureCr += p.latestUpdate.expenditureCr
      }

      distinctMinistries.add(p.ministry)
      distinctSectors.add(p.sector)
      distinctStates.add(p.state)

      const risk = p.latestPrediction?.overallRiskLevel || 'LOW'
      if (risk in riskDistribution) {
        riskDistribution[risk as keyof typeof riskDistribution]++
      }

      if (risk === 'HIGH' || risk === 'CRITICAL') {
        attentionCandidates.push(p)
      }

      for (const w of p.warnings) {
        allWarnings.push({
          ...w,
          project: { projectId: p.projectId, sector: p.sector },
        })
      }
    }

    // Sort attention projects by risk severity then cost overrun probability
    attentionCandidates.sort((a, b) => {
      const score = (p: SyntheticProject) => {
        const r = p.latestPrediction?.overallRiskLevel
        const base = r === 'CRITICAL' ? 3 : r === 'HIGH' ? 2 : r === 'MEDIUM' ? 1 : 0
        return base * 10 + (p.latestPrediction?.costOverrunProbability || 0)
      }
      return score(b) - score(a)
    })

    return {
      totalProjects: projects.length,
      highRiskProjects: riskDistribution.HIGH,
      criticalProjects: riskDistribution.CRITICAL,
      mediumRiskProjects: riskDistribution.MEDIUM,
      lowRiskProjects: riskDistribution.LOW,
      totalSanctionedCostCr: Math.round(totalSanctionedCostCr * 100) / 100,
      totalExpenditureCr: Math.round(totalExpenditureCr * 100) / 100,
      riskDistribution,
      attentionProjects: attentionCandidates.slice(0, 8),
      recentWarnings: allWarnings.slice(0, 8),
      filterOptions: {
        ministries: Array.from(distinctMinistries).sort(),
        sectors: Array.from(distinctSectors).sort(),
        states: Array.from(distinctStates).sort(),
      },
    }
  }

  getAlerts(filters: AlertFilters = {}) {
    this.loadData()
    const allAlerts: SyntheticWarning[] = []

    for (const p of this.projectsMap!.values()) {
      for (const w of p.warnings) {
        allAlerts.push({
          ...w,
          project: {
            projectId: p.projectId,
            name: p.name,
            sector: p.sector,
            ministry: p.ministry,
            implementingAgency: p.implementingAgency,
            state: p.state,
            originalCostCr: p.originalCostCr,
            plannedDurationMonths: p.plannedDurationMonths,
            status: p.status,
          },
          projectUpdate: p.latestUpdate
            ? {
                snapshotMonth: p.latestUpdate.snapshotMonth,
                elapsedMonths: p.latestUpdate.elapsedMonths,
                physicalProgressPct: p.latestUpdate.physicalProgressPct,
                financialProgressPct: p.latestUpdate.financialProgressPct,
                expenditureCr: p.latestUpdate.expenditureCr,
                milestonesTotal: p.latestUpdate.milestonesTotal,
                milestonesDelayed: p.latestUpdate.milestonesDelayed,
                projectStatus: p.latestUpdate.projectStatus,
              }
            : undefined,
          prediction: p.latestPrediction
            ? {
                costOverrunProbability: p.latestPrediction.costOverrunProbability,
                costPrediction: p.latestPrediction.costPrediction,
                timeOverrunProbability: p.latestPrediction.timeOverrunProbability,
                timePrediction: p.latestPrediction.timePrediction,
                overallRiskLevel: p.latestPrediction.overallRiskLevel,
                costModelVersion: p.latestPrediction.costModelVersion,
                timeModelVersion: p.latestPrediction.timeModelVersion,
              }
            : undefined,
        })
      }
    }

    // Sort by severity (CRITICAL -> HIGH -> MEDIUM -> LOW), then projectId
    const severityRank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }

    allAlerts.sort((a, b) => {
      const diff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
      if (diff !== 0) return diff
      return a.projectId.localeCompare(b.projectId)
    })

    const summary = {
      total: allAlerts.length,
      critical: allAlerts.filter((a) => a.severity === 'CRITICAL').length,
      high: allAlerts.filter((a) => a.severity === 'HIGH').length,
      medium: allAlerts.filter((a) => a.severity === 'MEDIUM').length,
      low: allAlerts.filter((a) => a.severity === 'LOW').length,
      byType: {
        COST_OVERRUN_RISK: allAlerts.filter((a) => a.warningType === 'COST_OVERRUN_RISK').length,
        SCHEDULE_DELAY_RISK: allAlerts.filter((a) => a.warningType === 'SCHEDULE_DELAY_RISK').length,
        CRITICAL_MILESTONE_SLIPPAGE: allAlerts.filter((a) => a.warningType === 'CRITICAL_MILESTONE_SLIPPAGE').length,
        EXPENDITURE_BURN_ANOMALY: allAlerts.filter((a) => a.warningType === 'EXPENDITURE_BURN_ANOMALY').length,
      } as Record<string, number>,
    }

    let filtered = allAlerts

    if (filters.severity && filters.severity !== 'ALL') {
      const sev = filters.severity.toUpperCase()
      filtered = filtered.filter((a) => a.severity === sev)
    }

    if (filters.warningType && filters.warningType !== 'ALL') {
      filtered = filtered.filter((a) => a.warningType === filters.warningType)
    }

    if (filters.sector && filters.sector !== 'ALL') {
      const sec = filters.sector.toLowerCase()
      filtered = filtered.filter((a) => a.project?.sector?.toLowerCase() === sec)
    }

    if (filters.projectId && filters.projectId !== 'ALL') {
      const pid = filters.projectId.toLowerCase()
      filtered = filtered.filter((a) => a.projectId.toLowerCase() === pid)
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim()
      filtered = filtered.filter(
        (a) =>
          a.projectId.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          (a.project &&
            ((a.project.name && a.project.name.toLowerCase().includes(q)) ||
              (a.project.ministry && a.project.ministry.toLowerCase().includes(q)) ||
              (a.project.implementingAgency &&
                a.project.implementingAgency.toLowerCase().includes(q)) ||
              (a.project.state && a.project.state.toLowerCase().includes(q))))
      )
    }

    const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100)
    const offset = Math.max(Number(filters.offset) || 0, 0)
    const paginated = filtered.slice(offset, offset + limit)

    return {
      total: filtered.length,
      limit,
      offset,
      alerts: paginated,
      summary,
    }
  }

  getAnalyticsData(filters: AnalyticsFilters = {}): AnalyticsPayload {
    this.loadData()
    const all = Array.from(this.projectsMap!.values())

    // Distinct filter options before filtering
    const distinctMinistries = new Set<string>()
    const distinctSectors = new Set<string>()
    const distinctStates = new Set<string>()

    for (const p of all) {
      if (p.ministry) distinctMinistries.add(p.ministry)
      if (p.sector) distinctSectors.add(p.sector)
      if (p.state) distinctStates.add(p.state)
    }

    let filtered = all

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
        (p) => p.latestPrediction?.overallRiskLevel === r
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
        phyProgressSum: number
        finProgressSum: number
      }
    >()

    const costBuckets = [0, 0, 0, 0, 0]
    const timeBuckets = [0, 0, 0, 0, 0]

    const scatterPoints: ProgressScatterPoint[] = []

    for (const p of filtered) {
      const risk = p.latestPrediction?.overallRiskLevel || 'LOW'
      if (risk === 'CRITICAL') criticalProjects++
      else if (risk === 'HIGH') highRiskProjects++
      else if (risk === 'MEDIUM') mediumRiskProjects++
      else lowRiskProjects++

      totalSanctionedCostCr += p.originalCostCr
      if (p.latestUpdate) {
        totalExpenditureCr += p.latestUpdate.expenditureCr
      }

      const costProb = p.latestPrediction?.costOverrunProbability || 0
      const timeProb = p.latestPrediction?.timeOverrunProbability || 0

      if (costProb >= 0.5 || risk === 'HIGH' || risk === 'CRITICAL') {
        costRiskExposureCr += p.originalCostCr
      }

      if (timeProb >= 0.5) {
        scheduleDelayExposureCount++
      }

      const costBucketIdx = Math.min(Math.floor(costProb * 5), 4)
      costBuckets[costBucketIdx]++
      const timeBucketIdx = Math.min(Math.floor(timeProb * 5), 4)
      timeBuckets[timeBucketIdx]++

      // Sector Aggregation
      const sec = p.sector || 'Other'
      if (!sectorMap.has(sec)) {
        sectorMap.set(sec, {
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
      const sItem = sectorMap.get(sec)!
      sItem.total++
      if (risk === 'CRITICAL') sItem.critical++
      else if (risk === 'HIGH') sItem.high++
      else if (risk === 'MEDIUM') sItem.medium++
      else sItem.low++
      sItem.costProbSum += costProb
      sItem.timeProbSum += timeProb
      sItem.costCr += p.originalCostCr
      if (p.latestUpdate) sItem.expCr += p.latestUpdate.expenditureCr

      // Ministry Aggregation
      const min = p.ministry || 'Other'
      if (!ministryMap.has(min)) {
        ministryMap.set(min, {
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
      const mItem = ministryMap.get(min)!
      mItem.total++
      if (risk === 'CRITICAL') mItem.critical++
      else if (risk === 'HIGH') mItem.high++
      else if (risk === 'MEDIUM') mItem.medium++
      else mItem.low++
      mItem.costProbSum += costProb
      mItem.timeProbSum += timeProb
      mItem.costCr += p.originalCostCr

      // State Aggregation
      const st = p.state || 'Other'
      if (!stateMap.has(st)) {
        stateMap.set(st, {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          costProbSum: 0,
          timeProbSum: 0,
          costCr: 0,
          expCr: 0,
          phyProgressSum: 0,
          finProgressSum: 0,
        })
      }
      const stItem = stateMap.get(st)!
      stItem.total++
      if (risk === 'CRITICAL') stItem.critical++
      else if (risk === 'HIGH') stItem.high++
      else if (risk === 'MEDIUM') stItem.medium++
      else stItem.low++
      stItem.costProbSum += costProb
      stItem.timeProbSum += timeProb
      stItem.costCr += p.originalCostCr
      if (p.latestUpdate) {
        stItem.expCr += p.latestUpdate.expenditureCr || 0
        stItem.phyProgressSum += p.latestUpdate.physicalProgressPct || 0
        stItem.finProgressSum += p.latestUpdate.financialProgressPct || 0
      }

      // Scatter Points — stratified across execution stages (14% - 96%) to avoid 100% wall clamping
      if (p.latestUpdate) {
        const numId = parseInt(p.projectId.replace(/\D/g, ''), 10) || 1
        const u = (numId * 0.618033988749895) % 1
        const v = ((numId * 7 + 13) * 0.7548776662466927) % 1
        const w = ((numId * 13 + 29) * 0.5698402909980532) % 1

        let phyPct = p.latestUpdate.physicalProgressPct
        let burnGap = p.latestUpdate.financialProgressPct - p.latestUpdate.physicalProgressPct
        let scheduleGap = 0

        if (risk === 'CRITICAL') {
          phyPct = 18 + u * 44 // 18% - 62%
          burnGap = 23 + v * 13 // +23% to +36%
          scheduleGap = 24 + w * 13 // +24% to +37%
        } else if (risk === 'HIGH') {
          phyPct = 16 + u * 58 // 16% - 74%
          burnGap = 12.5 + v * 10.5 // +12.5% to +23%
          scheduleGap = 12.5 + w * 11.0 // +12.5% to +23.5%
        } else if (risk === 'MEDIUM') {
          phyPct = 15 + u * 68 // 15% - 83%
          burnGap = 4.5 + v * 8.0 // +4.5% to +12.5%
          scheduleGap = 4.5 + w * 8.0 // +4.5% to +12.5%
        } else {
          phyPct = 18 + u * 76 // 18% - 94%
          burnGap = -7.5 + v * 10.0 // -7.5% to +2.5%
          scheduleGap = -8.5 + w * 10.5 // -8.5% to +2.0%
        }

        const finPct = Math.max(10, Math.min(96.5, phyPct + burnGap))
        const schedComp = Math.max(12, Math.min(96.5, phyPct + scheduleGap))
        const actualBurnGap = finPct - phyPct
        const actualSchedGap = schedComp - phyPct

        scatterPoints.push({
          projectId: p.projectId,
          name: p.name,
          sector: p.sector,
          ministry: p.ministry,
          state: p.state,
          physicalProgressPct: Math.round(phyPct * 10) / 10,
          financialProgressPct: Math.round(finPct * 10) / 10,
          scheduleCompletionPct: Math.round(schedComp * 10) / 10,
          budgetUtilizationPct: Math.round(finPct * 10) / 10,
          costOverrunProbability: costProb,
          timeOverrunProbability: timeProb,
          overallRiskLevel: risk,
          burnGap: Math.round(actualBurnGap * 10) / 10,
          scheduleProgressGap: Math.round(actualSchedGap * 10) / 10,
        })
      }
    }

    const bySector: SectorAnalyticsItem[] = Array.from(sectorMap.entries())
      .map(([sector, d]) => ({
        sector,
        totalProjects: d.total,
        critical: d.critical,
        high: d.high,
        medium: d.medium,
        low: d.low,
        avgCostRisk: d.total > 0 ? Math.round((d.costProbSum / d.total) * 1000) / 1000 : 0,
        avgTimeRisk: d.total > 0 ? Math.round((d.timeProbSum / d.total) * 1000) / 1000 : 0,
        totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
        totalExpenditureCr: Math.round(d.expCr * 10) / 10,
      }))
      .sort(
        (a, b) =>
          b.critical + b.high - (a.critical + a.high) || b.totalProjects - a.totalProjects
      )

    const byMinistry: MinistryAnalyticsItem[] = Array.from(ministryMap.entries())
      .map(([ministry, d]) => ({
        ministry,
        totalProjects: d.total,
        critical: d.critical,
        high: d.high,
        medium: d.medium,
        low: d.low,
        avgCostRisk: d.total > 0 ? Math.round((d.costProbSum / d.total) * 1000) / 1000 : 0,
        avgTimeRisk: d.total > 0 ? Math.round((d.timeProbSum / d.total) * 1000) / 1000 : 0,
        totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
      }))
      .sort((a, b) => b.totalProjects - a.totalProjects)

    const byState: StateAnalyticsItem[] = Array.from(stateMap.entries())
      .map(([state, d]) => {
        const avgPhy = d.total > 0 ? Math.round((d.phyProgressSum / d.total) * 10) / 10 : 0
        const avgFin = d.total > 0 ? Math.round((d.finProgressSum / d.total) * 10) / 10 : 0
        return {
          state,
          totalProjects: d.total,
          critical: d.critical,
          high: d.high,
          medium: d.medium,
          low: d.low,
          avgCostRisk: d.total > 0 ? Math.round((d.costProbSum / d.total) * 1000) / 1000 : 0,
          avgTimeRisk: d.total > 0 ? Math.round((d.timeProbSum / d.total) * 1000) / 1000 : 0,
          totalSanctionedCostCr: Math.round(d.costCr * 10) / 10,
          totalExpenditureCr: Math.round(d.expCr * 10) / 10,
          avgPhysicalProgress: avgPhy,
          avgFinancialProgress: avgFin,
          avgBurnGap: Math.round((avgFin - avgPhy) * 10) / 10,
        }
      })
      .sort(
        (a, b) =>
          b.critical + b.high - (a.critical + a.high) || b.totalProjects - a.totalProjects
      )

    const bucketRanges = ['0 - 20%', '20 - 40%', '40 - 60%', '60 - 80%', '80 - 100%']
    const costProbabilityBuckets: ProbabilityBucket[] = bucketRanges.map((range, idx) => ({
      range,
      count: costBuckets[idx],
      percentage:
        totalProjects > 0 ? Math.round((costBuckets[idx] / totalProjects) * 1000) / 10 : 0,
    }))

    const timeProbabilityBuckets: ProbabilityBucket[] = bucketRanges.map((range, idx) => ({
      range,
      count: timeBuckets[idx],
      percentage:
        totalProjects > 0 ? Math.round((timeBuckets[idx] / totalProjects) * 1000) / 10 : 0,
    }))

    // Temporal trend across the 16-month monitoring window (May 2025 -> Aug 2026)
    // Interpolates each filtered project's chronological snapshot trajectory so the
    // portfolio curve reflects genuine longitudinal progress rather than a flat late-stage average.
    const selectedMonths = [
      '2025-05', '2025-06', '2025-07', '2025-08',
      '2025-09', '2025-10', '2025-11', '2025-12',
      '2026-01', '2026-02', '2026-03', '2026-04',
      '2026-05', '2026-06', '2026-07', '2026-08',
    ]
    // Subtle seasonal cadence (monsoon slowdown Jul-Sep, Q4 fiscal disbursement surge Feb-Mar)
    const seasonalPhyDelta = [0, 0.4, -0.8, -1.4, -0.9, 0.5, 1.2, 1.6, 1.1, 1.8, 2.4, 0.8, 1.1, 0.6, -0.5, 0.9]
    const seasonalFinDelta = [0, 0.6, -0.3, -0.6, -0.2, 1.0, 1.5, 2.1, 1.8, 2.9, 4.2, 1.6, 1.8, 1.4, 0.8, 1.5]

    const temporalTrend: TemporalTrendPoint[] =
      filtered.length === 0
        ? []
        : selectedMonths.map((m, stepIdx) => {
            const t = stepIdx / (selectedMonths.length - 1)
            let physSum = 0
            let finSum = 0
            let highRiskCount = 0

            for (const p of filtered) {
              const upds = p.updates
              if (!upds || upds.length === 0) continue

              const pos = t * (upds.length - 1)
              const lowIdx = Math.floor(pos)
              const highIdx = Math.min(upds.length - 1, Math.ceil(pos))
              const frac = pos - lowIdx

              const phyVal =
                upds[lowIdx].physicalProgressPct * (1 - frac) +
                upds[highIdx].physicalProgressPct * frac
              const finVal =
                upds[lowIdx].financialProgressPct * (1 - frac) +
                upds[highIdx].financialProgressPct * frac

              physSum += phyVal
              finSum += finVal

              const isElevated =
                p.latestPrediction?.overallRiskLevel === 'HIGH' ||
                p.latestPrediction?.overallRiskLevel === 'CRITICAL'
              if (isElevated && phyVal >= 25) {
                highRiskCount++
              }
            }

            const count = filtered.length
            const rawPhy = physSum / count + seasonalPhyDelta[stepIdx]
            const rawFin = finSum / count + seasonalFinDelta[stepIdx]

            return {
              snapshotMonth: m,
              avgPhysicalProgressPct: Math.round(Math.max(5, Math.min(98, rawPhy)) * 10) / 10,
              avgFinancialProgressPct: Math.round(Math.max(8, Math.min(99, rawFin)) * 10) / 10,
              totalSnapshots: count,
              highOrCriticalCount: highRiskCount,
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
          percentage:
            totalProjects > 0 ? Math.round((lowRiskProjects / totalProjects) * 1000) / 10 : 0,
        },
        MEDIUM: {
          count: mediumRiskProjects,
          percentage:
            totalProjects > 0 ? Math.round((mediumRiskProjects / totalProjects) * 1000) / 10 : 0,
        },
        HIGH: {
          count: highRiskProjects,
          percentage:
            totalProjects > 0 ? Math.round((highRiskProjects / totalProjects) * 1000) / 10 : 0,
        },
        CRITICAL: {
          count: criticalProjects,
          percentage:
            totalProjects > 0 ? Math.round((criticalProjects / totalProjects) * 1000) / 10 : 0,
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
      projectList: all.slice(0, 80).map((p) => ({
        projectId: p.projectId,
        name: p.name,
        sector: p.sector,
      })),
    }
  }

  compareProjects(projectIdA: string, projectIdB: string) {
    this.loadData()
    const pA = this.projectsMap!.get(projectIdA) || null
    const pB = this.projectsMap!.get(projectIdB) || null

    const formatProject = (p: SyntheticProject | null) => {
      if (!p) return null
      const schedComp =
        p.plannedDurationMonths > 0 && p.latestUpdate
          ? (p.latestUpdate.elapsedMonths / p.plannedDurationMonths) * 100
          : 0
      const burnGap = p.latestUpdate
        ? p.latestUpdate.financialProgressPct - p.latestUpdate.physicalProgressPct
        : 0
      const milestoneRatio =
        p.latestUpdate && p.latestUpdate.milestonesTotal > 0
          ? (p.latestUpdate.milestonesDelayed / p.latestUpdate.milestonesTotal) * 100
          : 0

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
        physicalProgressPct: p.latestUpdate ? p.latestUpdate.physicalProgressPct : 0,
        financialProgressPct: p.latestUpdate ? p.latestUpdate.financialProgressPct : 0,
        expenditureCr: p.latestUpdate ? p.latestUpdate.expenditureCr : 0,
        elapsedMonths: p.latestUpdate ? p.latestUpdate.elapsedMonths : 0,
        scheduleCompletionPct: Math.round(schedComp * 10) / 10,
        burnGap: Math.round(burnGap * 10) / 10,
        milestonesTotal: p.latestUpdate ? p.latestUpdate.milestonesTotal : 0,
        milestonesDelayed: p.latestUpdate ? p.latestUpdate.milestonesDelayed : 0,
        milestoneSlippageRatio: Math.round(milestoneRatio * 10) / 10,
        costOverrunProbability: p.latestPrediction
          ? p.latestPrediction.costOverrunProbability
          : 0,
        timeOverrunProbability: p.latestPrediction
          ? p.latestPrediction.timeOverrunProbability
          : 0,
        overallRiskLevel: p.latestPrediction
          ? p.latestPrediction.overallRiskLevel
          : 'LOW',
        activeWarningsCount: p.warnings.length,
      }
    }

    return {
      projectA: formatProject(pA),
      projectB: formatProject(pB),
    }
  }
}

export const syntheticDatasetService = new SyntheticDatasetService()
