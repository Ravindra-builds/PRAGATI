'use client'

import React, { useState } from 'react'
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import { InteractivePieChart } from '@/components/ui/InteractivePieChart'

interface RiskTierData {
  count: number
  percentage: number
}

interface PortfolioRiskSectionProps {
  distribution: {
    LOW: RiskTierData
    MEDIUM: RiskTierData
    HIGH: RiskTierData
    CRITICAL: RiskTierData
  }
  totalProjects: number
  activeRiskFilter: string
  onSelectRiskFilter: (risk: string) => void
}

export function PortfolioRiskSection({
  distribution,
  totalProjects,
  activeRiskFilter,
  onSelectRiskFilter,
}: PortfolioRiskSectionProps) {
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)

  const tiers = [
    {
      key: 'CRITICAL',
      label: 'Critical Risk',
      count: distribution.CRITICAL.count,
      percentage: distribution.CRITICAL.percentage,
      icon: ShieldAlert,
      color: '#f43f5e',
      darkColor: '#be123c',
      bgClass: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-900',
      activeClass: 'ring-2 ring-rose-500 bg-rose-100/90 -translate-y-0.5 shadow-xs',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      barColor: 'bg-rose-600',
      barText: 'Critical',
      description: 'Severe cost and schedule risk indicators',
    },
    {
      key: 'HIGH',
      label: 'High Risk',
      count: distribution.HIGH.count,
      percentage: distribution.HIGH.percentage,
      icon: AlertTriangle,
      color: '#f97316',
      darkColor: '#c2410c',
      bgClass: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900',
      activeClass: 'ring-2 ring-amber-500 bg-amber-100/90 -translate-y-0.5 shadow-xs',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      barColor: 'bg-amber-500',
      barText: 'High',
      description: 'Significant expenditure burn gap or milestone slippage',
    },
    {
      key: 'MEDIUM',
      label: 'Medium Risk',
      count: distribution.MEDIUM.count,
      percentage: distribution.MEDIUM.percentage,
      icon: AlertCircle,
      color: '#eab308',
      darkColor: '#a16207',
      bgClass: 'bg-yellow-50/70 hover:bg-yellow-100/70 border-yellow-200 text-yellow-900',
      activeClass: 'ring-2 ring-yellow-500 bg-yellow-100/80 -translate-y-0.5 shadow-xs',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      barColor: 'bg-yellow-400',
      barText: 'Medium',
      description: 'Early divergence between spending pace and progress',
    },
    {
      key: 'LOW',
      label: 'Low Risk',
      count: distribution.LOW.count,
      percentage: distribution.LOW.percentage,
      icon: ShieldCheck,
      color: '#10b981',
      darkColor: '#047857',
      bgClass: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900',
      activeClass: 'ring-2 ring-emerald-500 bg-emerald-100/90 -translate-y-0.5 shadow-xs',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      barColor: 'bg-emerald-500',
      barText: 'Low',
      description: 'Progress pace aligns with budget utilization',
    },
  ]

  // Pie slices ordered LOW -> MEDIUM -> HIGH -> CRITICAL clockwise from top
  const pieSlices = [...tiers].reverse().map((t) => ({
    key: t.key,
    label: t.label,
    count: t.count,
    pct: t.percentage,
    color: t.color,
    darkColor: t.darkColor,
    description: t.description,
  }))

  const activeTierObj =
    tiers.find((t) => t.key === hoveredTier) ||
    tiers.find((t) => t.key === activeRiskFilter) ||
    null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Portfolio Risk Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Projects grouped by current predicted risk level.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-mono font-bold text-slate-800">{totalProjects}</span> projects
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* 3D Solid Wedge Pie Chart with Inline Percentages & Instant 0ms Hover */}
        <InteractivePieChart
          slices={pieSlices}
          total={totalProjects}
          hoveredKey={hoveredTier}
          selectedKey={activeRiskFilter !== 'ALL' ? activeRiskFilter : undefined}
          onHoverKey={setHoveredTier}
          onSelectKey={(key) => onSelectRiskFilter(activeRiskFilter === key ? 'ALL' : key)}
        />

        <div className="flex-1 w-full space-y-4">
          {/* Stacked Proportional Bar with Instant 0ms Hover */}
          <div className="space-y-1.5">
            <div className="w-full h-5 rounded-lg overflow-hidden flex bg-slate-100 border border-slate-200 shadow-inner">
              {tiers.map((t) => {
                if (t.percentage <= 0) return null
                const isHovered = hoveredTier === t.key || activeRiskFilter === t.key
                const isDimmed = hoveredTier !== null && hoveredTier !== t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onMouseEnter={() => setHoveredTier(t.key)}
                    onMouseLeave={() => setHoveredTier(null)}
                    onClick={() => onSelectRiskFilter(activeRiskFilter === t.key ? 'ALL' : t.key)}
                    className={`${t.barColor} h-full transition-all duration-150 cursor-pointer flex items-center justify-center text-[10px] font-bold text-white tracking-wider ${
                      isHovered ? 'brightness-110 scale-y-105' : isDimmed ? 'opacity-65' : ''
                    }`}
                    style={{ width: `${t.percentage}%` }}
                  >
                    {t.percentage >= 7 && `${Math.round(t.percentage)}%`}
                  </button>
                )
              })}
            </div>

            {/* Instant 0ms Communication Callout Bar */}
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
                      {activeTierObj.description}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                    {activeTierObj.count} projects ({activeTierObj.percentage}%)
                  </span>
                </>
              ) : (
                <div className="w-full flex items-center justify-between text-slate-500">
                  <span>0%</span>
                  <span className="text-[11px] text-slate-500">
                    Hover any pie slice, bar segment, or card for instant details &bull; Click to filter cohort
                  </span>
                  <span>100%</span>
                </div>
              )}
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tiers.map((t) => {
              const Icon = t.icon
              const isSelected = activeRiskFilter === t.key
              const isHovered = hoveredTier === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onMouseEnter={() => setHoveredTier(t.key)}
                  onMouseLeave={() => setHoveredTier(null)}
                  onClick={() => onSelectRiskFilter(isSelected ? 'ALL' : t.key)}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isSelected || isHovered ? t.activeClass : t.bgClass
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {t.label}
                    </span>
                    <Icon className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-slate-900">
                      {t.count}
                    </span>
                    <span className="text-xs font-semibold font-mono text-slate-600">
                      ({t.percentage}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">
                    {t.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
