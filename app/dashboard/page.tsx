'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2,
  AlertTriangle,
  ShieldAlert,
  IndianRupee,
  Activity,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { RiskBadge, RiskTier } from '@/components/ui/RiskBadge'
import { StatCard } from '@/components/ui/StatCard'
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { InteractivePieChart } from '@/components/ui/InteractivePieChart'

interface DashboardSummaryData {
  totalProjects: number
  highRiskProjects: number
  criticalProjects: number
  mediumRiskProjects: number
  lowRiskProjects: number
  totalSanctionedCostCr: number
  totalExpenditureCr: number
  riskDistribution: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  attentionProjects: Array<{
    id: string
    projectId: string
    name: string
    sector: string
    ministry: string
    state: string
    originalCostCr: number
    latestUpdate: {
      physicalProgressPct: number
      financialProgressPct: number
      expenditureCr: number
      milestonesTotal: number
      milestonesDelayed: number
      snapshotMonth: string
    } | null
    latestPrediction: {
      costOverrunProbability: number
      timeOverrunProbability: number
      overallRiskLevel: string
    } | null
  }>
  recentWarnings: Array<{
    id: string
    projectId: string
    warningType: string
    severity: string
    title: string
    message: string
    project?: {
      projectId: string
      sector: string
    }
  }>
  filterOptions: {
    ministries: string[]
    sectors: string[]
    states: string[]
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedSector, setSelectedSector] = useState('ALL')
  const [selectedMinistry, setSelectedMinistry] = useState('ALL')
  const [selectedState, setSelectedState] = useState('ALL')
  const [hoveredRiskTier, setHoveredRiskTier] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedSector !== 'ALL') params.set('sector', selectedSector)
      if (selectedMinistry !== 'ALL') params.set('ministry', selectedMinistry)
      if (selectedState !== 'ALL') params.set('state', selectedState)

      const res = await fetch(`/api/dashboard/summary?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        throw new Error(json.error?.message || 'Failed to retrieve summary')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error communicating with dashboard API')
    } finally {
      setLoading(false)
    }
  }, [selectedSector, selectedMinistry, selectedState])

  useEffect(() => {
    queueMicrotask(() => {
      fetchSummary()
    })
  }, [fetchSummary])

  const resetFilters = () => {
    setSelectedSector('ALL')
    setSelectedMinistry('ALL')
    setSelectedState('ALL')
  }

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Infrastructure Portfolio Overview
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 tracking-wider">
              Synthetic Demo Data
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Real-time project health, dual-target risk distribution, and early warning intelligence.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchSummary()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold rounded-lg text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-colors"
          >
            <span>Projects Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Lightweight Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Portfolio Filters</span>
          </div>

          {(selectedSector !== 'ALL' ||
            selectedMinistry !== 'ALL' ||
            selectedState !== 'ALL') && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Sector filter */}
          <div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full h-9 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              aria-label="Filter by Sector"
            >
              <option value="ALL">All Sectors</option>
              {data?.filterOptions?.sectors?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Ministry filter */}
          <div>
            <select
              value={selectedMinistry}
              onChange={(e) => setSelectedMinistry(e.target.value)}
              className="w-full h-9 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              aria-label="Filter by Ministry"
            >
              <option value="ALL">All Ministries</option>
              {data?.filterOptions?.ministries?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* State filter */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full h-9 text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              aria-label="Filter by State"
            >
              <option value="ALL">All States</option>
              {data?.filterOptions?.states?.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could Not Load Dashboard Overview"
          message={error}
          retry={fetchSummary}
        />
      )}

      {/* KPI Cards: Neutral for general metrics, Semantic accents only for risk */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <StatCard
            title="Total Projects"
            value={data.totalProjects}
            subtext="National monitored assets"
            accent="neutral"
            icon={<Building2 className="w-4 h-4 text-slate-600" />}
          />
          <StatCard
            title="Critical Risk"
            value={data.criticalProjects}
            subtext="Severe dual overrun risk"
            accent="danger"
            icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
            badge={{
              text: `${data.totalProjects > 0 ? ((data.criticalProjects / data.totalProjects) * 100).toFixed(0) : 0}%`,
              variant: 'danger',
            }}
          />
          <StatCard
            title="High Risk"
            value={data.highRiskProjects}
            subtext="Predicted cost/schedule breach"
            accent="warning"
            icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
            badge={{
              text: `${data.totalProjects > 0 ? ((data.highRiskProjects / data.totalProjects) * 100).toFixed(0) : 0}%`,
              variant: 'warning',
            }}
          />
          <StatCard
            title="Sanctioned Cost"
            value={formatCurrency(data.totalSanctionedCostCr)}
            subtext="Total baseline budget"
            accent="neutral"
            icon={<IndianRupee className="w-4 h-4 text-slate-600" />}
          />
          <StatCard
            title="Expenditure"
            value={formatCurrency(data.totalExpenditureCr)}
            subtext={`Cumulative burn (${data.totalSanctionedCostCr > 0 ? ((data.totalExpenditureCr / data.totalSanctionedCostCr) * 100).toFixed(1) : 0}% of budget)`}
            accent="neutral"
            icon={<Activity className="w-4 h-4 text-slate-600" />}
          />
        </div>
      ) : null}

      {/* Middle Section: Risk Distribution & Early Warning Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Portfolio Risk Tier Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Projects grouped by current predicted risk.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              N = {data?.totalProjects || 0}
            </span>
          </div>

          {data ? (
            (() => {
              const total = data.totalProjects || 1
              const pieSlices = [
                {
                  key: 'LOW',
                  label: 'Low Risk',
                  shortLabel: 'Low',
                  count: data.riskDistribution.LOW,
                  pct: (data.riskDistribution.LOW / total) * 100,
                  color: '#10b981',
                  darkColor: '#047857',
                  barClass: 'bg-emerald-500',
                  cardBg: 'bg-emerald-50/60 border-emerald-100',
                  cardActive: 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-300 shadow-xs -translate-y-0.5',
                  dotClass: 'bg-emerald-500',
                  titleColor: 'text-emerald-800',
                  numColor: 'text-emerald-950',
                  subColor: 'text-emerald-600',
                  desc: 'Progress pace aligns with budget utilization',
                },
                {
                  key: 'MEDIUM',
                  label: 'Medium Risk',
                  shortLabel: 'Medium',
                  count: data.riskDistribution.MEDIUM,
                  pct: (data.riskDistribution.MEDIUM / total) * 100,
                  color: '#eab308',
                  darkColor: '#a16207',
                  barClass: 'bg-amber-400',
                  cardBg: 'bg-amber-50/60 border-amber-100',
                  cardActive: 'ring-2 ring-amber-500 bg-amber-100/70 border-amber-300 shadow-xs -translate-y-0.5',
                  dotClass: 'bg-amber-400',
                  titleColor: 'text-amber-800',
                  numColor: 'text-amber-950',
                  subColor: 'text-amber-600',
                  desc: 'Early divergence between spending pace and progress',
                },
                {
                  key: 'HIGH',
                  label: 'High Risk',
                  shortLabel: 'High',
                  count: data.riskDistribution.HIGH,
                  pct: (data.riskDistribution.HIGH / total) * 100,
                  color: '#f97316',
                  darkColor: '#c2410c',
                  barClass: 'bg-orange-500',
                  cardBg: 'bg-orange-50/60 border-orange-100',
                  cardActive: 'ring-2 ring-orange-500 bg-orange-100/70 border-orange-300 shadow-xs -translate-y-0.5',
                  dotClass: 'bg-orange-500',
                  titleColor: 'text-orange-800',
                  numColor: 'text-orange-950',
                  subColor: 'text-orange-600',
                  desc: 'Significant expenditure burn gap or milestone slippage',
                },
                {
                  key: 'CRITICAL',
                  label: 'Critical Risk',
                  shortLabel: 'Critical',
                  count: data.riskDistribution.CRITICAL,
                  pct: (data.riskDistribution.CRITICAL / total) * 100,
                  color: '#f43f5e',
                  darkColor: '#be123c',
                  barClass: 'bg-rose-500',
                  cardBg: 'bg-rose-50/60 border-rose-100',
                  cardActive: 'ring-2 ring-rose-500 bg-rose-100/70 border-rose-300 shadow-xs -translate-y-0.5',
                  dotClass: 'bg-rose-500',
                  titleColor: 'text-rose-800',
                  numColor: 'text-rose-950',
                  subColor: 'text-rose-600',
                  desc: 'Severe dual cost and schedule overrun exposure',
                },
              ]

              // Ordered Critical -> High -> Medium -> Low for bar & cards
              const orderedTiers = [...pieSlices].reverse()
              const activeTierObj = orderedTiers.find((t) => t.key === hoveredRiskTier) || null

              return (
                <div className="flex flex-col md:flex-row items-center gap-6 pt-1">
                  {/* 3D Solid Wedge Pie Chart with Inline Percentages & Instant Hover */}
                  <InteractivePieChart
                    slices={pieSlices}
                    total={data.totalProjects}
                    hoveredKey={hoveredRiskTier}
                    onHoverKey={setHoveredRiskTier}
                  />

                  {/* Stacked Bar + Instant Callout + 4 Tier Cards */}
                  <div className="flex-1 w-full space-y-4">
                    {/* Distribution Stacked Bar with Instant 0ms Hover */}
                    <div className="space-y-1.5">
                      <div className="w-full h-5 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200/80">
                        {orderedTiers.map((t) => {
                          if (t.pct <= 0) return null
                          const isHovered = hoveredRiskTier === t.key
                          const isDimmed = hoveredRiskTier !== null && !isHovered
                          return (
                            <div
                              key={t.key}
                              style={{ width: `${t.pct}%` }}
                              onMouseEnter={() => setHoveredRiskTier(t.key)}
                              onMouseLeave={() => setHoveredRiskTier(null)}
                              className={`${t.barClass} h-full transition-all duration-150 cursor-pointer flex items-center justify-center text-[10px] font-mono font-bold text-white ${
                                isHovered ? 'brightness-110 scale-y-105' : isDimmed ? 'opacity-65' : ''
                              }`}
                            >
                              {t.pct >= 8 ? `${Math.round(t.pct)}%` : ''}
                            </div>
                          )
                        })}
                      </div>

                      {/* Instant Zero-Delay Communication Bar Below Stacked Bar */}
                      <div className="min-h-6 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] transition-all duration-75">
                        {activeTierObj ? (
                          <>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: activeTierObj.color }}
                              />
                              <span>{activeTierObj.label}:</span>
                              <span className="font-normal text-slate-600 truncate">
                                {activeTierObj.desc}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                              {activeTierObj.count} projects ({activeTierObj.pct.toFixed(1)}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500">
                            Hover any pie wedge, bar segment, or card for instant breakdown details.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Legend Grid: Critical -> High -> Medium -> Low */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {orderedTiers.map((t) => {
                        const isHovered = hoveredRiskTier === t.key
                        return (
                          <Link
                            key={t.key}
                            href={`/dashboard/projects?risk=${t.key}`}
                            onMouseEnter={() => setHoveredRiskTier(t.key)}
                            onMouseLeave={() => setHoveredRiskTier(null)}
                            className={`p-3 rounded-lg border transition-all duration-150 block ${
                              isHovered ? t.cardActive : t.cardBg
                            }`}
                          >
                            <div className={`flex items-center justify-between text-xs font-semibold ${t.titleColor}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${t.dotClass} shrink-0`} />
                                <span>{t.shortLabel}</span>
                              </div>
                              <span className="font-mono text-[10px] opacity-80">
                                {Math.round(t.pct)}%
                              </span>
                            </div>
                            <div className={`mt-1 text-xl font-bold ${t.numColor} font-mono`}>
                              {t.count}
                            </div>
                            <div className={`text-[11px] ${t.subColor}`}>
                              {t.pct.toFixed(1)}% of portfolio
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="h-36 flex items-center justify-center">
              <span className="text-xs text-slate-400">Loading risk breakdown...</span>
            </div>
          )}
        </div>

        {/* Early Warning Feed Card: Warning Title prominent */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Early Warning Feed
              </h2>
            </div>
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              Automated Rules
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1">
            {data?.recentWarnings && data.recentWarnings.length > 0 ? (
              data.recentWarnings.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {w.title}
                    </h3>
                    <RiskBadge level={w.severity as RiskTier} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Link
                      href={`/dashboard/projects/${w.projectId}`}
                      className="font-mono font-semibold text-blue-700 hover:underline"
                    >
                      {w.projectId}
                    </Link>
                    {w.project?.sector && (
                      <span>&bull; {w.project.sector}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                    {w.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="text-xs text-slate-500">No active alerts triggered</span>
              </div>
            )}
          </div>

          {/* Footer link to Alerts Center */}
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {data?.recentWarnings ? `${data.recentWarnings.length} recent signals` : ''}
            </span>
            <Link
              href="/dashboard/alerts"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group"
            >
              <span>View All Warnings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Projects Requiring Attention Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Projects Requiring Immediate Attention
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                Priority Queue
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by dual-target overrun probabilities and indicator distress signals.
            </p>
          </div>
          <Link
            href="/dashboard/projects"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
          >
            <span>View All ({data?.totalProjects || 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading && !data ? (
          <TableSkeleton rows={6} />
        ) : data?.attentionProjects && data.attentionProjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-2.5 px-4">Project ID &amp; Name</th>
                  <th className="py-2.5 px-4">Sector &amp; State</th>
                  <th className="py-2.5 px-4 text-right">Sanctioned</th>
                  <th className="py-2.5 px-4 text-center">Cost Overrun Risk</th>
                  <th className="py-2.5 px-4 text-center">Schedule Delay Risk</th>
                  <th className="py-2.5 px-4 text-center">Overall Risk</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.attentionProjects.map((proj) => {
                  const costProb = proj.latestPrediction?.costOverrunProbability ?? 0
                  const timeProb = proj.latestPrediction?.timeOverrunProbability ?? 0
                  const riskLevel = proj.latestPrediction?.overallRiskLevel || 'HIGH'

                  return (
                    <tr
                      key={proj.projectId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <Link
                          href={`/dashboard/projects/${proj.projectId}`}
                          className="font-mono font-bold text-blue-700 hover:underline block"
                        >
                          {proj.projectId}
                        </Link>
                        <span className="text-slate-600 text-[11px] truncate max-w-xs block">
                          {proj.name}
                        </span>
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="font-medium text-slate-800 block">
                          {proj.sector}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {proj.state}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                        ₹{proj.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold ${
                              costProb >= 0.75
                                ? 'text-rose-600'
                                : costProb >= 0.5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {(costProb * 100).toFixed(1)}%
                          </span>
                          <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className={`h-full ${
                                costProb >= 0.75
                                  ? 'bg-rose-500'
                                  : costProb >= 0.5
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${costProb * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold ${
                              timeProb >= 0.75
                                ? 'text-rose-600'
                                : timeProb >= 0.5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {(timeProb * 100).toFixed(1)}%
                          </span>
                          <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className={`h-full ${
                                timeProb >= 0.75
                                  ? 'bg-rose-500'
                                  : timeProb >= 0.5
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${timeProb * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <RiskBadge level={riskLevel as RiskTier} size="sm" />
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/dashboard/projects/${proj.projectId}`}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors border border-blue-200"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No High Risk Projects Found"
            description="All projects under current filter parameters are within acceptable risk tolerances."
          />
        )}
      </div>
    </div>
  )
}
