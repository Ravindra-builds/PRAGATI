'use client'

import React, { useState } from 'react'
import { Calendar } from 'lucide-react'
import { TemporalTrendPoint } from '@/lib/services/synthetic-dataset'

interface PortfolioRiskTrendProps {
  trend: TemporalTrendPoint[]
}

export function PortfolioRiskTrend({ trend }: PortfolioRiskTrendProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!trend || trend.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-400">
        No temporal data available for current selection
      </div>
    )
  }

  // Dimensions
  const width = 760
  const height = 230
  const padding = { top: 20, right: 30, bottom: 40, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const n = trend.length
  const getX = (i: number) => {
    if (n <= 1) return padding.left + chartWidth / 2
    return padding.left + (i / (n - 1)) * chartWidth
  }

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    return padding.top + chartHeight - (clamped / 100) * chartHeight
  }

  // Make SVG path
  const makePath = (key: 'avgPhysicalProgressPct' | 'avgFinancialProgressPct') => {
    return trend
      .map((d, i) => {
        const x = getX(i)
        const y = getY(d[key])
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  const physicalPath = makePath('avgPhysicalProgressPct')
  const financialPath = makePath('avgFinancialProgressPct')

  const activePoint = hoveredIndex !== null ? trend[hoveredIndex] : null

  const latestSnapshot = trend[trend.length - 1]
  const diff = latestSnapshot
    ? Math.round((latestSnapshot.avgFinancialProgressPct - latestSnapshot.avgPhysicalProgressPct) * 10) / 10
    : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Portfolio Execution Over Time
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            How physical delivery compares with financial utilization over time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-emerald-700">
            <span className="w-3 h-1 bg-emerald-500 rounded-full" />
            <span>Physical Delivery</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-blue-700">
            <span className="w-3 h-1 bg-blue-600 rounded-full" />
            <span>Financial Utilization</span>
          </div>
        </div>
      </div>

      {/* Insight Callout */}
      {latestSnapshot && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center justify-between">
          <span>
            In the latest reporting period ({latestSnapshot.snapshotMonth}), financial utilization is{' '}
            <strong>{Math.abs(diff)} percentage points {diff >= 0 ? 'ahead of' : 'behind'}</strong> physical delivery across the portfolio.
          </span>
        </div>
      )}

      {/* Trajectory SVG */}
      <div className="relative w-full bg-slate-50/40 rounded-xl border border-slate-200 p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Temporal progress chart across snapshot months"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={padding.left + chartWidth}
                y2={getY(val)}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Paths */}
          <path
            d={physicalPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={financialPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {trend.map((d, i) => {
            const x = getX(i)
            const yPhy = getY(d.avgPhysicalProgressPct)
            const yFin = getY(d.avgFinancialProgressPct)
            const isHovered = hoveredIndex === i

            return (
              <g
                key={d.snapshotMonth}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Financial point */}
                <circle
                  cx={x}
                  cy={yFin}
                  r={isHovered ? 5 : 3.5}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Physical point */}
                <circle
                  cx={x}
                  cy={yPhy}
                  r={isHovered ? 5 : 3.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* X axis tick text (every 3rd or start/end) */}
                {(i === 0 || i === n - 1 || i % 3 === 0) && (
                  <text
                    x={x}
                    y={padding.top + chartHeight + 18}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-mono"
                  >
                    {d.snapshotMonth}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover Snapshot Tooltip */}
        {activePoint && (
          <div className="absolute top-4 right-4 bg-slate-900/95 text-white px-3 py-2 rounded-lg shadow-md border border-slate-700 text-xs font-mono backdrop-blur-xs flex items-center gap-3">
            <span className="font-bold text-slate-200">{activePoint.snapshotMonth}</span>
            <span>&bull;</span>
            <span className="text-emerald-400">Delivery: {activePoint.avgPhysicalProgressPct}%</span>
            <span>&bull;</span>
            <span className="text-blue-400">Utilization: {activePoint.avgFinancialProgressPct}%</span>
            <span>&bull;</span>
            <span className="text-rose-400">Elevated: {activePoint.highOrCriticalCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}
