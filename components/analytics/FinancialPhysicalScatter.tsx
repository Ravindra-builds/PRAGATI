'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react'
import { ProgressScatterPoint } from '@/lib/services/synthetic-dataset'

interface FinancialPhysicalScatterProps {
  points: ProgressScatterPoint[]
}

export function FinancialPhysicalScatter({ points }: FinancialPhysicalScatterProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ProgressScatterPoint | null>(null)

  // Dimensions
  const width = 640
  const height = 380
  const padding = { top: 20, right: 30, bottom: 45, left: 55 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Coordinate mappers
  const getX = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    return padding.left + (clamped / 100) * chartWidth
  }

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    return padding.top + chartHeight - (clamped / 100) * chartHeight
  }

  const getPointVisuals = (risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    switch (risk) {
      case 'CRITICAL':
        return { color: '#e11d48', opacity: 0.95, radius: 5.5 }
      case 'HIGH':
        return { color: '#f59e0b', opacity: 0.85, radius: 4.5 }
      case 'MEDIUM':
        return { color: '#eab308', opacity: 0.60, radius: 3.5 }
      case 'LOW':
        return { color: '#10b981', opacity: 0.35, radius: 2.8 }
    }
  }

  // Count points where financial > physical (burn gap > 0)
  const overspendingCount = points.filter((p) => p.burnGap > 0).length
  const overspendingPct = points.length > 0 ? ((overspendingCount / points.length) * 100).toFixed(1) : '0'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Are projects using money faster than they are completing work?
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Projects above the diagonal line have spent more relative to the work completed.
        </p>
      </div>

      {/* Insight Card */}
      <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-bold text-orange-950 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>
              {overspendingCount} projects ({overspendingPct}%) are currently above the parity line.
            </span>
          </div>
          <p className="text-orange-800 text-[11px]">
            This means financial utilization is currently ahead of physical delivery for these projects.
          </p>
        </div>
      </div>

      {/* Reading Helper */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          <strong>How to read this:</strong> Points above the diagonal line indicate financial utilization is ahead of physical delivery.
        </span>
      </div>

      {/* Scatter Plot */}
      <div className="relative w-full bg-slate-50/50 rounded-xl border border-slate-200 p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Scatter plot showing financial progress versus physical progress"
        >
          {/* Over-expenditure danger polygon (above diagonal) */}
          <polygon
            points={`${getX(0)},${getY(0)} ${getX(0)},${getY(100)} ${getX(100)},${getY(100)}`}
            fill="#fff1f2"
            fillOpacity="0.45"
          />

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => (
            <g key={val}>
              {/* Horizontal */}
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

              {/* Vertical */}
              <line
                x1={getX(val)}
                y1={padding.top}
                x2={getX(val)}
                y2={padding.top + chartHeight}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={getX(val)}
                y={padding.top + chartHeight + 14}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Diagonal Reference Line (y = x) */}
          <line
            x1={getX(0)}
            y1={getY(0)}
            x2={getX(100)}
            y2={getY(100)}
            stroke="#94a3b8"
            strokeWidth="1.75"
            strokeDasharray="5 4"
          />
          <text
            x={getX(68) + 8}
            y={getY(68) + 14}
            className="text-[10px] fill-slate-500 font-semibold italic"
            transform={`rotate(-31, ${getX(68)}, ${getY(68)})`}
          >
            Parity line: spending equals progress
          </text>

          {/* Zone labels */}
          <text
            x={getX(12)}
            y={getY(82)}
            className="text-[10px] fill-rose-600 font-semibold uppercase tracking-wider opacity-75"
          >
            &uarr; Higher spending than progress
          </text>

          {/* Axis Labels */}
          <text
            x={padding.left + chartWidth / 2}
            y={height - 8}
            textAnchor="middle"
            className="text-xs fill-slate-600 font-semibold"
          >
            Physical Progress Completed (%) &rarr;
          </text>
          <text
            x={-height / 2}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            className="text-xs fill-slate-600 font-semibold"
          >
            Financial Progress Utilized (%) &rarr;
          </text>

          {/* Points */}
          {points.map((p) => {
            const cx = getX(p.physicalProgressPct)
            const cy = getY(p.financialProgressPct)
            const isHovered = hoveredPoint?.projectId === p.projectId
            const visual = getPointVisuals(p.overallRiskLevel)

            return (
              <circle
                key={p.projectId}
                cx={cx}
                cy={cy}
                r={isHovered ? 7.5 : visual.radius}
                fill={visual.color}
                fillOpacity={isHovered ? 1 : visual.opacity}
                stroke={isHovered ? '#0f172a' : p.overallRiskLevel === 'CRITICAL' ? '#ffffff' : 'none'}
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer transition-all duration-100"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            )
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900/95 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs w-64 backdrop-blur-xs z-10 space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
              <span className="font-bold text-slate-100 truncate pr-2">
                {hoveredPoint.name}
              </span>
              <span className="font-mono text-[10px] text-slate-400 shrink-0">
                {hoveredPoint.projectId}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              {hoveredPoint.sector} &bull; {hoveredPoint.state}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Physical:</span>
                <span className="font-bold text-emerald-400">{hoveredPoint.physicalProgressPct}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Financial:</span>
                <span className="font-bold text-blue-400">{hoveredPoint.financialProgressPct}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Burn Gap:</span>
                <span className={`font-bold ${hoveredPoint.burnGap > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {hoveredPoint.burnGap > 0 ? `+${hoveredPoint.burnGap}%` : `${hoveredPoint.burnGap}%`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cost Risk:</span>
                <span className="font-bold text-amber-400">
                  {(hoveredPoint.costOverrunProbability * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[10px]">
              <span
                className="px-1.5 py-0.5 rounded font-bold uppercase"
                style={{
                  backgroundColor: `${getPointVisuals(hoveredPoint.overallRiskLevel).color}33`,
                  color: getPointVisuals(hoveredPoint.overallRiskLevel).color,
                }}
              >
                {hoveredPoint.overallRiskLevel} Risk
              </span>
              <Link
                href={`/dashboard/projects/${hoveredPoint.projectId}`}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold underline"
              >
                <span>View Project &rarr;</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100 text-slate-600">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Risk Tiers:</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="font-medium text-slate-700">Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-medium text-slate-700">High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-slate-500">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-60" />
            <span className="text-slate-500">Low</span>
          </div>
        </div>
      </div>
    </div>
  )
}
