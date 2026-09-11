'use client'

import React from 'react'
import {
  Layers,
  AlertTriangle,
  IndianRupee,
  Clock,
} from 'lucide-react'

interface SummaryMetrics {
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

interface AnalyticsSummaryCardsProps {
  summary: SummaryMetrics | null
}

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
  }

  if (!summary) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Projects Analyzed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>Projects Analyzed</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold font-mono text-slate-900">
          {summary.totalProjects}
        </div>
        <div className="text-xs text-slate-500">
          Active monitored projects in selection
        </div>
      </div>

      {/* 2. High / Critical Risk Concentration */}
      <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-xs space-y-2 bg-rose-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase tracking-wide">
          <span>High / Critical Risk</span>
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-rose-950">
            {summary.highOrCriticalPct}%
          </span>
          <span className="text-xs font-semibold text-rose-700 font-mono">
            ({summary.criticalProjects + summary.highRiskProjects} projects)
          </span>
        </div>
        <div className="text-xs text-rose-600">
          {summary.criticalProjects} critical &bull; {summary.highRiskProjects} high risk
        </div>
      </div>

      {/* 3. Cost Risk Exposure */}
      <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-xs space-y-2 bg-orange-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-orange-800 uppercase tracking-wide">
          <span>Cost Risk Exposure</span>
          <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div className="text-3xl font-extrabold font-mono text-orange-950">
          {formatCurrency(summary.costRiskExposureCr)}
        </div>
        <div className="text-xs text-orange-700">
          Sanctioned budget in higher-risk projects
        </div>
      </div>

      {/* 4. Schedule Delay Exposure */}
      <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-xs space-y-2 bg-amber-50/20">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-800 uppercase tracking-wide">
          <span>Schedule Delay Exposure</span>
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-amber-950">
            {summary.scheduleDelayExposurePct}%
          </span>
          <span className="text-xs font-semibold text-amber-800 font-mono">
            ({summary.scheduleDelayExposureCount} projects)
          </span>
        </div>
        <div className="text-xs text-amber-700">
          Projects with elevated delay risk (&ge;50%)
        </div>
      </div>
    </div>
  )
}
