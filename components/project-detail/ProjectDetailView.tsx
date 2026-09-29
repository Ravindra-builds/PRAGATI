'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Bot,
} from 'lucide-react'
import { RiskBadge, RiskTier } from '@/components/ui/RiskBadge'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { TrajectoryChart, SnapshotPoint } from './TrajectoryChart'
import { RiskDriversPanel, DriverItem } from './RiskDriversPanel'

interface ProjectDetailData {
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
  updates: Array<{
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
  }>
  predictions: Array<{
    id: string
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    overallRiskLevel: string
    costModelVersion: string
    timeModelVersion: string
    createdAt: string
  }>
  warnings: Array<{
    id: string
    warningType: string
    severity: string
    title: string
    message: string
    createdAt: string
  }>
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI Inference Execution State
  const [predicting, setPredicting] = useState(false)
  const [predictSuccess, setPredictSuccess] = useState<string | null>(null)
  const [predictError, setPredictError] = useState<string | null>(null)
  const [latestDrivers, setLatestDrivers] = useState<DriverItem[] | null>(null)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        throw new Error(`Project not found (HTTP ${res.status})`)
      }
      const data = await res.json()
      if (Array.isArray(data.updates)) {
        data.updates.sort((a: { snapshotMonth: string }, b: { snapshotMonth: string }) =>
          a.snapshotMonth.localeCompare(b.snapshotMonth)
        )
      }
      setProject(data)
      setError(null)

      // If project has updates, compute initial heuristic drivers if not predicted yet
      if (data.updates && data.updates.length > 0) {
        const latest = data.updates[data.updates.length - 1]
        const burnGap = latest.financialProgressPct - latest.physicalProgressPct
        const milestoneRatio =
          latest.milestonesTotal > 0 ? latest.milestonesDelayed / latest.milestonesTotal : 0
        const elapsedRatio =
          data.plannedDurationMonths > 0 ? latest.elapsedMonths / data.plannedDurationMonths : 0

        const initialDrivers: DriverItem[] = [
          {
            feature: 'financial_vs_physical_gap',
            display_name: 'Financial vs Physical Progress Gap',
            value: `${burnGap > 0 ? '+' : ''}${burnGap.toFixed(1)}%`,
            contribution: burnGap > 10 ? 0.38 : burnGap > 0 ? 0.15 : -0.12,
            direction: burnGap > 5 ? 'increases_risk' : 'decreases_risk',
          },
          {
            feature: 'milestones_delayed_ratio',
            display_name: 'Milestone Slippage Ratio',
            value: `${(milestoneRatio * 100).toFixed(0)}% delayed`,
            contribution: milestoneRatio > 0.3 ? 0.29 : milestoneRatio > 0 ? 0.12 : -0.18,
            direction: milestoneRatio > 0.2 ? 'increases_risk' : 'decreases_risk',
          },
          {
            feature: 'elapsed_duration_ratio',
            display_name: 'Elapsed vs Planned Duration',
            value: `${(elapsedRatio * 100).toFixed(0)}% elapsed`,
            contribution: elapsedRatio > 0.8 ? 0.22 : -0.09,
            direction: elapsedRatio > 0.7 ? 'increases_risk' : 'decreases_risk',
          },
          {
            feature: 'physical_progress_pct',
            display_name: 'Physical Delivery Progress',
            value: `${latest.physicalProgressPct.toFixed(1)}%`,
            contribution: latest.physicalProgressPct < 30 ? 0.18 : -0.21,
            direction: latest.physicalProgressPct < 30 ? 'increases_risk' : 'decreases_risk',
          },
          {
            feature: 'expenditure_to_sanction',
            display_name: 'Budget Utilization Ratio',
            value: `${((latest.expenditureCr / data.originalCostCr) * 100).toFixed(1)}%`,
            contribution: latest.financialProgressPct > 80 ? 0.15 : -0.05,
            direction: latest.financialProgressPct > 70 ? 'increases_risk' : 'decreases_risk',
          },
        ]
        setLatestDrivers(initialDrivers)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project details')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    queueMicrotask(() => {
      fetchProject()
    })
  }, [fetchProject])

  const handleRunPrediction = async () => {
    setPredicting(true)
    setPredictSuccess(null)
    setPredictError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/predict`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Prediction generation failed')
      }

      setPredictSuccess('Predictive risk assessment and factor impact updated successfully.')

      // If drivers returned from FastAPI
      if (data.drivers && data.drivers.cost && data.drivers.cost.length > 0) {
        setLatestDrivers(data.drivers.cost)
      }

      // Refresh project to get latest prediction row & warnings
      await fetchProject()
    } catch (err: unknown) {
      setPredictError(err instanceof Error ? err.message : 'ML Service error')
    } finally {
      setPredicting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="h-5 w-32 bg-slate-200 animate-pulse rounded" />
        <div className="h-24 bg-white rounded-xl border border-slate-200 p-6 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <ErrorState
          title="Project Not Found"
          message={error || `Could not find project with ID ${projectId}`}
          retry={fetchProject}
        />
        <div className="mt-6 text-center">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Projects Directory</span>
          </Link>
        </div>
      </div>
    )
  }

  const latestUpdate =
    project.updates && project.updates.length > 0
      ? project.updates[project.updates.length - 1]
      : null

  const latestPrediction =
    project.predictions && project.predictions.length > 0
      ? project.predictions[0]
      : null

  const costProb = latestPrediction ? latestPrediction.costOverrunProbability : 0.25
  const timeProb = latestPrediction ? latestPrediction.timeOverrunProbability : 0.25
  const overallRisk = (latestPrediction?.overallRiskLevel || 'LOW') as RiskTier

  // Trajectory points for S-curve
  const trajectoryPoints: SnapshotPoint[] = (project.updates || []).map((u) => ({
    snapshotMonth: u.snapshotMonth,
    physicalProgressPct: u.physicalProgressPct,
    financialProgressPct: u.financialProgressPct,
    elapsedMonths: u.elapsedMonths,
    expenditureCr: u.expenditureCr,
  }))

  // Performance calculations
  const phyPct = latestUpdate?.physicalProgressPct ?? 0
  const finPct = latestUpdate?.financialProgressPct ?? 0
  const burnGap = finPct - phyPct
  const elapsedMonths = latestUpdate?.elapsedMonths ?? 0
  const plannedMonths = project.plannedDurationMonths ?? 1
  const elapsedRatio = Math.min(100, Math.round((elapsedMonths / plannedMonths) * 100))
  const milestonesTotal = latestUpdate?.milestonesTotal ?? 0
  const milestonesDelayed = latestUpdate?.milestonesDelayed ?? 0
  const slippageRatio =
    milestonesTotal > 0 ? Math.round((milestonesDelayed / milestonesTotal) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects Directory</span>
        </Link>

        {/* Prediction Trigger & Intelligence Assistant */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/dashboard/assistant?projectId=${encodeURIComponent(project.projectId)}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ask PRAGATI about this project &rarr;</span>
          </Link>

          <button
            type="button"
            onClick={handleRunPrediction}
            disabled={predicting}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Zap className={`w-3.5 h-3.5 ${predicting ? 'animate-spin' : ''}`} />
            <span>{predicting ? 'Evaluating Risk Telemetry...' : 'Assess Project Risk'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {predictSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{predictSuccess}</span>
        </div>
      )}
      {predictError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{predictError}</span>
        </div>
      )}

      {/* Project Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {project.projectId}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                {project.sector}
              </span>
              <RiskBadge level={overallRisk} size="sm" />
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 tracking-wider">
                Synthetic Demo Data
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ministry: <strong className="text-slate-700">{project.ministry}</strong> &bull; Agency:{' '}
              <strong className="text-slate-700">{project.implementingAgency}</strong> &bull; State:{' '}
              <strong className="text-slate-700">{project.state}</strong>
            </p>
          </div>

          {/* Baseline Sanction Metrics */}
          <div className="flex flex-wrap items-center gap-5 pt-2 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sanctioned Cost
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
                ₹{project.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Approved Duration
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
                {project.plannedDurationMonths} Months
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Monitoring History
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-blue-700">
                {project.updates.length} Snapshots
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Risk Cards: Probability is the strongest element */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cost Overrun Risk Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-colors space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-rose-50 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Cost Overrun Risk
              </span>
            </div>
            <RiskBadge
              level={costProb >= 0.8 ? 'CRITICAL' : costProb >= 0.5 ? 'HIGH' : costProb >= 0.35 ? 'MEDIUM' : 'LOW'}
              size="sm"
            />
          </div>

          {/* Primary Probability Number */}
          <div className="space-y-1">
            <div
              className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
                costProb >= 0.75
                  ? 'text-rose-600'
                  : costProb >= 0.5
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {(costProb * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Chance of budget overrun
            </p>
          </div>

          {/* Probability Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  costProb >= 0.75
                    ? 'bg-rose-500'
                    : costProb >= 0.5
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${costProb * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0% Normal</span>
              <span>50% Cutoff</span>
              <span>100% Critical</span>
            </div>
          </div>

          {/* Secondary Model Info */}
          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Model: Logistic Regression (L2)</span>
            <span className="font-semibold text-slate-700">
              {costProb >= 0.5 ? 'Flagged for Escalation' : 'Within Tolerance'}
            </span>
          </div>
        </div>

        {/* Schedule Delay Risk Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-colors space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-50 text-orange-600">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Schedule Delay Risk
              </span>
            </div>
            <RiskBadge
              level={timeProb >= 0.8 ? 'CRITICAL' : timeProb >= 0.5 ? 'HIGH' : timeProb >= 0.35 ? 'MEDIUM' : 'LOW'}
              size="sm"
            />
          </div>

          {/* Primary Probability Number */}
          <div className="space-y-1">
            <div
              className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
                timeProb >= 0.75
                  ? 'text-rose-600'
                  : timeProb >= 0.5
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {(timeProb * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Chance of schedule delay
            </p>
          </div>

          {/* Probability Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  timeProb >= 0.75
                    ? 'bg-rose-500'
                    : timeProb >= 0.5
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${timeProb * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0% On Time</span>
              <span>50% Cutoff</span>
              <span>100% Critical</span>
            </div>
          </div>

          {/* Secondary Model Info */}
          <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Model: Random Forest (150 trees)</span>
            <span className="font-semibold text-slate-700">
              {timeProb >= 0.5 ? 'Flagged for Delay' : 'On Schedule'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Intelligence Assistant Quick Action Banner */}
      <div className="bg-linear-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100/80 text-indigo-700">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Have questions about {project.projectId}&apos;s risk trajectory or warning indicators?
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ask PRAGATI Project Intelligence to explain model drivers, analyze telemetry gaps, or suggest review steps.
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/assistant?projectId=${encodeURIComponent(project.projectId)}`}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
        >
          <span>Ask PRAGATI</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Middle Section: Progress Trajectory & Key Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: S-Curve Progress Trajectory */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Historical Progress Trajectory (S-Curve)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical delivery progress vs financial expenditure across all monthly monitoring snapshots.
            </p>
          </div>

          <TrajectoryChart data={trajectoryPoints} />
        </div>

        {/* Right 5 cols: Performance Indicators */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Key Monitoring Indicators
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              PAIMANA / OCMS execution metrics from latest snapshot ({latestUpdate?.snapshotMonth || 'N/A'}).
            </p>
          </div>

          {/* Indicator 1: Physical vs Financial */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Physical Delivery:</span>
              <span className="font-mono font-bold text-emerald-700">{phyPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${phyPct}%` }} />
            </div>

            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">Financial Utilization:</span>
              <span className="font-mono font-bold text-blue-700">{finPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${finPct}%` }} />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs mt-1.5">
              <span className="text-slate-600">Expenditure vs Physical Gap:</span>
              <span
                className={`font-mono font-bold ${
                  burnGap >= 15 ? 'text-rose-600' : burnGap >= 5 ? 'text-amber-600' : 'text-slate-700'
                }`}
              >
                {burnGap > 0 ? `+${burnGap.toFixed(1)}%` : `${burnGap.toFixed(1)}%`}
              </span>
            </div>
          </div>

          {/* Indicator 2: Duration */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Duration Elapsed:</span>
              <span className="font-mono font-bold text-slate-800">
                {elapsedMonths} of {plannedMonths} Mos ({elapsedRatio}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${elapsedRatio > 90 ? 'bg-rose-500' : 'bg-slate-600'}`}
                style={{ width: `${elapsedRatio}%` }}
              />
            </div>
          </div>

          {/* Indicator 3: Milestones */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Milestone Slippage:</span>
              <span className="font-mono font-bold text-slate-800">
                {milestonesDelayed} of {milestonesTotal} delayed ({slippageRatio}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${slippageRatio >= 30 ? 'bg-rose-500' : 'bg-amber-400'}`}
                style={{ width: `${slippageRatio}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Risk Drivers Panel */}
      <RiskDriversPanel drivers={latestDrivers} />

      {/* Active Early Warning Alerts (Deduplicated by Rule with Full Project Telemetry Context) */}
      {(() => {
        const seenTypes = new Set<string>()
        const uniqueWarnings = (project.warnings || []).filter((w) => {
          if (seenTypes.has(w.warningType)) return false
          seenTypes.add(w.warningType)
          return true
        })

        const getRuleDetails = (warningType: string) => {
          switch (warningType) {
            case 'COST_OVERRUN_RISK':
              return {
                category: 'ML Cost Model Signal',
                badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
                metrics: [
                  {
                    label: 'Predicted Overrun Prob',
                    value: `${(costProb * 100).toFixed(1)}%`,
                    sub: 'Threshold: ≥ 50.0%',
                    highlight: 'text-rose-600',
                  },
                  {
                    label: 'Sanctioned vs Spent',
                    value: `₹${(latestUpdate?.expenditureCr ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} / ₹${project.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`,
                    sub: `${finPct.toFixed(1)}% utilized`,
                    highlight: 'text-slate-900',
                  },
                  {
                    label: 'Physical Delivery',
                    value: `${phyPct.toFixed(1)}%`,
                    sub: `Burn Gap: ${burnGap > 0 ? '+' : ''}${burnGap.toFixed(1)}%`,
                    highlight: burnGap >= 15 ? 'text-rose-600' : 'text-emerald-700',
                  },
                ],
                action: `Audit contractor Running Account (RA) bills with ${project.implementingAgency} against verified site completion before releasing the next financial tranche.`,
              }
            case 'SCHEDULE_DELAY_RISK':
              return {
                category: 'ML Schedule Model Signal',
                badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
                metrics: [
                  {
                    label: 'Predicted Delay Prob',
                    value: `${(timeProb * 100).toFixed(1)}%`,
                    sub: 'Threshold: ≥ 50.0%',
                    highlight: 'text-amber-600',
                  },
                  {
                    label: 'Time Elapsed vs Planned',
                    value: `${elapsedMonths} of ${plannedMonths} Mos`,
                    sub: `${elapsedRatio}% duration elapsed`,
                    highlight: elapsedRatio >= 85 ? 'text-rose-600' : 'text-slate-900',
                  },
                  {
                    label: 'Remaining Workload',
                    value: `${Math.max(0, 100 - phyPct).toFixed(1)}% Work Left`,
                    sub: `${Math.max(0, plannedMonths - elapsedMonths)} mos remaining`,
                    highlight: 'text-slate-900',
                  },
                ],
                action: `Convene schedule recovery review with ${project.implementingAgency} (${project.state}) to fast-track critical-path bottlenecks and revise milestone targets.`,
              }
            case 'EXPENDITURE_BURN_ANOMALY':
              return {
                category: 'Financial Burn Anomaly',
                badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
                metrics: [
                  {
                    label: 'Expenditure-Physical Gap',
                    value: `${burnGap > 0 ? '+' : ''}${burnGap.toFixed(1)}%`,
                    sub: 'Threshold: ≥ +15.0%',
                    highlight: 'text-rose-600',
                  },
                  {
                    label: 'Financial Utilization',
                    value: `${finPct.toFixed(1)}%`,
                    sub: `₹${(latestUpdate?.expenditureCr ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr spent`,
                    highlight: 'text-blue-700',
                  },
                  {
                    label: 'On-Ground Physical',
                    value: `${phyPct.toFixed(1)}%`,
                    sub: `Snapshot: ${latestUpdate?.snapshotMonth || 'Latest'}`,
                    highlight: 'text-emerald-700',
                  },
                ],
                action: `Verify Utilization Certificates (UCs) and pause non-milestone-linked mobilization advances until physical progress reconciles with disbursement.`,
              }
            case 'CRITICAL_MILESTONE_SLIPPAGE':
            default:
              return {
                category: 'Milestone Execution Bottleneck',
                badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
                metrics: [
                  {
                    label: 'Milestone Slippage Rate',
                    value: `${slippageRatio}% Delayed`,
                    sub: 'Threshold: ≥ 30% Delayed',
                    highlight: 'text-rose-600',
                  },
                  {
                    label: 'Delayed Milestones',
                    value: `${milestonesDelayed} of ${milestonesTotal}`,
                    sub: `${Math.max(0, milestonesTotal - milestonesDelayed)} on track`,
                    highlight: 'text-slate-900',
                  },
                  {
                    label: 'Execution Status',
                    value: latestUpdate?.projectStatus || project.status,
                    sub: `Agency: ${project.implementingAgency}`,
                    highlight: 'text-slate-800',
                  },
                ],
                action: `Escalate pending Right-of-Way (RoW), utility shifting, or statutory clearance dependencies in ${project.state} to the PRAGATI nodal officer.`,
              }
          }
        }

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Active Early Warnings &amp; Diagnostic Advisories
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deduplicated active risk rules triggered for <strong>{project.projectId}</strong> ({project.name}) at snapshot{' '}
                  <strong className="font-mono">{latestUpdate?.snapshotMonth || 'Latest'}</strong>, showing exact metric thresholds and recommended officer actions.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-mono font-semibold">
                  {uniqueWarnings.length} Active {uniqueWarnings.length === 1 ? 'Rule' : 'Rules'}
                </span>
                <Link
                  href={`/dashboard/alerts?projectId=${project.projectId}`}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 hover:underline"
                >
                  <span>View in Alerts Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {uniqueWarnings.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {uniqueWarnings.map((w) => {
                  const details = getRuleDetails(w.warningType)
                  return (
                    <div
                      key={w.warningType}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3 hover:border-slate-300 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        {/* Top Title & Severity */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${details.badgeColor}`}
                              >
                                {details.category}
                              </span>
                              <span className="font-mono text-[10px] font-semibold text-slate-400">
                                {w.warningType}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {w.title}
                            </h4>
                          </div>
                          <RiskBadge level={w.severity as RiskTier} size="sm" />
                        </div>

                        {/* Project Context Pill */}
                        <div className="text-[11px] text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                          <span className="truncate">
                            <strong className="font-mono text-slate-800">{project.projectId}</strong> &bull;{' '}
                            {project.implementingAgency} ({project.state})
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            Snapshot: {latestUpdate?.snapshotMonth || 'Latest'}
                          </span>
                        </div>

                        {/* 3-Column Concrete Telemetry vs Threshold Breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          {details.metrics.map((m) => (
                            <div
                              key={m.label}
                              className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5"
                            >
                              <div className="text-[10px] text-slate-400 font-medium truncate">
                                {m.label}
                              </div>
                              <div className={`text-xs font-bold font-mono truncate ${m.highlight}`}>
                                {m.value}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{m.sub}</div>
                            </div>
                          ))}
                        </div>

                        {/* Diagnostic Message */}
                        <p className="text-xs text-slate-700 leading-relaxed">{w.message}</p>
                      </div>

                      {/* Actionable Review Recommendation */}
                      <div className="pt-2.5 border-t border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">Recommended Officer Action: </span>
                          <span>{details.action}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No Active Anomalies Detected</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Project indicators are progressing within expected contractual tolerances.
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Snapshot History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Monitoring Snapshots History ({project.updates.length} Months)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological log of PAIMANA observation-time records.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-4">Snapshot Month</th>
                <th className="py-2.5 px-4 text-center">Elapsed Mos</th>
                <th className="py-2.5 px-4 text-center">Physical Progress</th>
                <th className="py-2.5 px-4 text-center">Financial Progress</th>
                <th className="py-2.5 px-4 text-right">Expenditure (₹ Cr)</th>
                <th className="py-2.5 px-4 text-center">Milestones Delayed</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {project.updates.map((upd) => (
                <tr key={upd.snapshotMonth} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-700">
                    {upd.snapshotMonth}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                    {upd.elapsedMonths}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-semibold text-emerald-700">
                    {upd.physicalProgressPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono font-semibold text-blue-700">
                    {upd.financialProgressPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                    ₹{upd.expenditureCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`font-mono font-medium ${
                        upd.milestonesDelayed > 0 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {upd.milestonesDelayed} / {upd.milestonesTotal}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {upd.projectStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
