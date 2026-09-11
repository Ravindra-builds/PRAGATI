'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Scale,
  ExternalLink,
} from 'lucide-react'
import { ProjectLookupItem } from '@/lib/services/synthetic-dataset'

interface ProjectComparisonData {
  projectId: string
  name: string
  sector: string
  ministry: string
  state: string
  implementingAgency: string
  originalCostCr: number
  plannedDurationMonths: number
  status: string
  physicalProgressPct: number
  financialProgressPct: number
  expenditureCr: number
  elapsedMonths: number
  scheduleCompletionPct: number
  burnGap: number
  milestonesTotal: number
  milestonesDelayed: number
  milestoneSlippageRatio: number
  costOverrunProbability: number
  timeOverrunProbability: number
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  activeWarningsCount: number
}

interface ProjectComparisonToolProps {
  projectList: ProjectLookupItem[]
}

export function ProjectComparisonTool({ projectList }: ProjectComparisonToolProps) {
  const [selectedA, setSelectedA] = useState<string>(() => (projectList && projectList.length > 0 ? projectList[0].projectId : ''))
  const [selectedB, setSelectedB] = useState<string>(() => (projectList && projectList.length > 1 ? projectList[1].projectId : ''))

  const effectiveA = selectedA || projectList?.[0]?.projectId || ''
  const effectiveB = selectedB || projectList?.[1]?.projectId || ''

  const [loading, setLoading] = useState<boolean>(Boolean(effectiveA && effectiveB))
  const [comparison, setComparison] = useState<{
    projectA: ProjectComparisonData | null
    projectB: ProjectComparisonData | null
  } | null>(null)

  // Fetch comparison data when selected projects change
  useEffect(() => {
    if (!effectiveA || !effectiveB) return

    let isMounted = true

    fetch(`/api/analytics/compare?projectA=${encodeURIComponent(effectiveA)}&projectB=${encodeURIComponent(effectiveB)}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setComparison(res.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load project comparison:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveA, effectiveB])

  const getRiskBadge = (risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
  }

  const pA = comparison?.projectA
  const pB = comparison?.projectB

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Compare Two Projects
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Side-by-side benchmark of delivery progress, budget utilization, and predicted risk.
            </p>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Select Project A
          </label>
          <select
            value={effectiveA}
            onChange={(e) => {
              setSelectedA(e.target.value)
              setLoading(true)
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {projectList.map((p) => (
              <option key={`a-${p.projectId}`} value={p.projectId}>
                [{p.projectId}] {p.name} ({p.sector})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            Select Project B
          </label>
          <select
            value={effectiveB}
            onChange={(e) => {
              setSelectedB(e.target.value)
              setLoading(true)
            }}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {projectList.map((p) => (
              <option key={`b-${p.projectId}`} value={p.projectId}>
                [{p.projectId}] {p.name} ({p.sector})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-xs text-slate-400 font-medium animate-pulse">
          Loading comparative analysis metrics...
        </div>
      )}

      {/* Comparison Grid */}
      {!loading && pA && pB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Card A */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs relative">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Project A &bull; {pA.projectId}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                  {pA.name}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {pA.sector} &bull; {pA.state}
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getRiskBadge(pA.overallRiskLevel)}`}>
                {pA.overallRiskLevel} Risk
              </span>
            </div>

            {/* Metric Rows */}
            <div className="space-y-3 text-xs">
              {/* Financial Progress */}
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="text-slate-600 font-medium">Sanctioned / Spent:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{pA.expenditureCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} / ₹{pA.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                </span>
              </div>

              {/* Progress vs Burn */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Physical Delivery:</span>
                  <span className="font-mono font-bold text-emerald-700">{pA.physicalProgressPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Financial Utilization:</span>
                  <span className="font-mono font-bold text-blue-700">{pA.financialProgressPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Burn Gap:</span>
                  <span className={`font-mono font-bold ${pA.burnGap > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {pA.burnGap > 0 ? `+${pA.burnGap}%` : `${pA.burnGap}%`}
                  </span>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Schedule Completion:</span>
                  <span className="font-mono font-bold text-slate-800">{pA.scheduleCompletionPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Milestone Slippage:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {pA.milestonesDelayed} / {pA.milestonesTotal} ({pA.milestoneSlippageRatio}%)
                  </span>
                </div>
              </div>

              {/* Model Probabilities */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Cost Overrun Probability:</span>
                  <span className="font-mono font-bold text-orange-700">
                    {(pA.costOverrunProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Schedule Delay Probability:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {(pA.timeOverrunProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Active Warnings:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {pA.activeWarningsCount} warnings
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/dashboard/projects/${pA.projectId}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Inspect Full Dossier</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Card B */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs relative">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Project B &bull; {pB.projectId}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                  {pB.name}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {pB.sector} &bull; {pB.state}
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${getRiskBadge(pB.overallRiskLevel)}`}>
                {pB.overallRiskLevel} Risk
              </span>
            </div>

            {/* Metric Rows */}
            <div className="space-y-3 text-xs">
              {/* Financial Progress */}
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="text-slate-600 font-medium">Sanctioned / Spent:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{pB.expenditureCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} / ₹{pB.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                </span>
              </div>

              {/* Progress vs Burn */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Physical Delivery:</span>
                  <span className="font-mono font-bold text-emerald-700">{pB.physicalProgressPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Financial Utilization:</span>
                  <span className="font-mono font-bold text-blue-700">{pB.financialProgressPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Burn Gap:</span>
                  <span className={`font-mono font-bold ${pB.burnGap > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {pB.burnGap > 0 ? `+${pB.burnGap}%` : `${pB.burnGap}%`}
                  </span>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Schedule Completion:</span>
                  <span className="font-mono font-bold text-slate-800">{pB.scheduleCompletionPct}%</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Milestone Slippage:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {pB.milestonesDelayed} / {pB.milestonesTotal} ({pB.milestoneSlippageRatio}%)
                  </span>
                </div>
              </div>

              {/* Model Probabilities */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Cost Overrun Probability:</span>
                  <span className="font-mono font-bold text-orange-700">
                    {(pB.costOverrunProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Schedule Delay Probability:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {(pB.timeOverrunProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Active Warnings:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {pB.activeWarningsCount} warnings
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/dashboard/projects/${pB.projectId}`}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Inspect Full Dossier</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
