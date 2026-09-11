'use client'

import React, { useState } from 'react'

export interface SnapshotPoint {
  snapshotMonth: string
  physicalProgressPct: number
  financialProgressPct: number
  elapsedMonths: number
  expenditureCr: number
}

interface TrajectoryChartProps {
  data: SnapshotPoint[]
}

export function TrajectoryChart({ data }: TrajectoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No snapshot trajectory data available
      </div>
    )
  }

  // Chart dimensions
  const width = 760
  const height = 280
  const padding = { top: 20, right: 30, bottom: 40, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const n = data.length
  const getX = (index: number) => {
    if (n <= 1) return padding.left + chartWidth / 2
    return padding.left + (index / (n - 1)) * chartWidth
  }

  const getY = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct))
    return padding.top + chartHeight - (clamped / 100) * chartHeight
  }

  // Generate SVG path for points
  const makePath = (key: 'physicalProgressPct' | 'financialProgressPct') => {
    return data
      .map((d, i) => {
        const x = getX(i)
        const y = getY(d[key])
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  const physicalPath = makePath('physicalProgressPct')
  const financialPath = makePath('financialProgressPct')

  // Generate subtle fill area under physical progress
  const firstX = getX(0)
  const lastX = getX(n - 1)
  const baselineY = padding.top + chartHeight
  const physicalArea = `${physicalPath} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-emerald-700">
            <span className="w-3 h-1 bg-emerald-500 rounded-full" />
            <span>Physical Delivery (%)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-blue-700">
            <span className="w-3 h-1 bg-blue-600 rounded-full" />
            <span>Financial Utilization (%)</span>
          </div>
        </div>

        {activePoint && (
          <div className="text-xs font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="font-bold">{activePoint.snapshotMonth}</span> &bull; Phy: {activePoint.physicalProgressPct.toFixed(1)}% &bull; Fin: {activePoint.financialProgressPct.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto bg-white rounded-lg border border-slate-100 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="S-Curve chart of physical progress versus financial expenditure over time"
        >
          {/* Background Grid Lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = getY(pct)
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray={pct > 0 && pct < 100 ? '4 4' : undefined}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {pct}%
                </text>
              </g>
            )
          })}

          {/* Fill under Physical Curve */}
          <path
            d={physicalArea}
            fill="rgba(16, 185, 129, 0.06)"
          />

          {/* Financial Progress Line (Blue) */}
          <path
            d={financialPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Physical Progress Line (Emerald) */}
          <path
            d={physicalPath}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Dots & Hover trigger */}
          {data.map((d, i) => {
            const x = getX(i)
            const yPhy = getY(d.physicalProgressPct)
            const yFin = getY(d.financialProgressPct)
            const isHovered = hoveredIndex === i

            return (
              <g
                key={d.snapshotMonth}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover trigger bar */}
                <rect
                  x={x - 15}
                  y={padding.top}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                />

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

                {/* Dot for Financial Progress */}
                <circle
                  cx={x}
                  cy={yFin}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* Dot for Physical Progress */}
                <circle
                  cx={x}
                  cy={yPhy}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* X-axis Month Label (Render alternating or all if < 8 points) */}
                {(n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-mono"
                  >
                    {d.snapshotMonth.substring(2)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
