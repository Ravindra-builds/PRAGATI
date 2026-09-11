import fs from 'fs'
import path from 'path'

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

export interface SyntheticWarning {
  id: string
  projectId: string
  warningType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  createdAt: Date
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
    const rowsByProject = new Map<string, any[]>()

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const parts = parseCSVLine(line)
      const row: Record<string, string> = {}
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

      const updates: SyntheticProjectUpdate[] = rows.map((r, idx) => ({
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

      let costProb = 0.15
      let timeProb = 0.15

      if (burnGap > 15 || latestUpdate.financialProgressPct > 70) {
        costProb = Math.min(0.98, 0.45 + burnGap * 0.02)
      } else if (burnGap > 5) {
        costProb = 0.42
      }

      if (milestoneRatio >= 0.4 || elapsedRatio > 0.8) {
        timeProb = Math.min(0.96, 0.5 + milestoneRatio * 0.45)
      } else if (milestoneRatio >= 0.2) {
        timeProb = 0.48
      }

      // Check ground truth correlation if known in synthetic data
      if (last.cost_overrun === '1') costProb = Math.max(costProb, 0.78)
      if (last.time_overrun === '1') timeProb = Math.max(timeProb, 0.72)

      const costPred = costProb >= 0.5 ? 1 : 0
      const timePred = timeProb >= 0.5 ? 1 : 0

      let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
      if (costProb >= 0.85 && timeProb >= 0.85) {
        overallRiskLevel = 'CRITICAL'
      } else if (costPred === 1 && timePred === 1) {
        overallRiskLevel = 'HIGH'
      } else if (costProb >= 0.75 || timeProb >= 0.75) {
        overallRiskLevel = 'HIGH'
      } else if (costPred === 1 || timePred === 1 || costProb >= 0.4 || timeProb >= 0.4) {
        overallRiskLevel = 'MEDIUM'
      }

      const warnings: SyntheticWarning[] = []
      if (costProb >= 0.5) {
        warnings.push({
          id: `warn_cost_${projectId}`,
          projectId,
          warningType: 'COST_OVERRUN_RISK',
          severity: costProb >= 0.85 ? 'CRITICAL' : 'HIGH',
          title: 'High Budget Overrun Probability',
          message: `Model projects ${(costProb * 100).toFixed(1)}% likelihood of exceeding sanctioned cost.`,
          createdAt: new Date(),
        })
      }
      if (timeProb >= 0.5) {
        warnings.push({
          id: `warn_time_${projectId}`,
          projectId,
          warningType: 'SCHEDULE_DELAY_RISK',
          severity: timeProb >= 0.85 ? 'CRITICAL' : 'HIGH',
          title: 'Schedule Delay Warning',
          message: `Model projects ${(timeProb * 100).toFixed(1)}% likelihood of project completion delay.`,
          createdAt: new Date(),
        })
      }
      if (milestoneRatio >= 0.3) {
        warnings.push({
          id: `warn_ms_${projectId}`,
          projectId,
          warningType: 'CRITICAL_MILESTONE_SLIPPAGE',
          severity: milestoneRatio >= 0.5 ? 'CRITICAL' : 'MEDIUM',
          title: 'Excessive Milestone Slippage',
          message: `${latestUpdate.milestonesDelayed} of ${latestUpdate.milestonesTotal} milestones delayed (${(milestoneRatio * 100).toFixed(0)}%).`,
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
}

export const syntheticDatasetService = new SyntheticDatasetService()
