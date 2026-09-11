'use client'

import React from 'react'
import { ShieldCheck, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react'

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
  const tiers = [
    {
      key: 'CRITICAL',
      label: 'Critical Risk',
      count: distribution.CRITICAL.count,
      percentage: distribution.CRITICAL.percentage,
      icon: ShieldAlert,
      bgClass: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-900',
      activeClass: 'ring-2 ring-rose-500 bg-rose-100/90',
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
      bgClass: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900',
      activeClass: 'ring-2 ring-amber-500 bg-amber-100/90',
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
      bgClass: 'bg-yellow-50/70 hover:bg-yellow-100/70 border-yellow-200 text-yellow-900',
      activeClass: 'ring-2 ring-yellow-500 bg-yellow-100/80',
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
      bgClass: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900',
      activeClass: 'ring-2 ring-emerald-500 bg-emerald-100/90',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      barColor: 'bg-emerald-500',
      barText: 'Low',
      description: 'Progress pace aligns with budget utilization',
    },
  ]

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

      {/* Stacked Proportional Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-5 rounded-lg overflow-hidden flex bg-slate-100 border border-slate-200 shadow-inner">
          {tiers.map((t) => {
            if (t.percentage <= 0) return null
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelectRiskFilter(activeRiskFilter === t.key ? 'ALL' : t.key)}
                className={`${t.barColor} h-full transition-all duration-300 hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white tracking-wider`}
                style={{ width: `${t.percentage}%` }}
                title={`${t.label}: ${t.count} projects (${t.percentage}%)`}
              >
                {t.percentage >= 8 && `${t.percentage}%`}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
          <span>0%</span>
          <span className="text-[10px] text-slate-400 italic">Click any segment or card to filter cohort</span>
          <span>100%</span>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tiers.map((t) => {
          const Icon = t.icon
          const isSelected = activeRiskFilter === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelectRiskFilter(isSelected ? 'ALL' : t.key)}
              className={`text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected ? t.activeClass : t.bgClass
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
  )
}
