'use client'

import React, { useMemo, useState } from 'react'
import IndiaMapData from '@svg-maps/india'
import { StateAnalyticsItem } from '@/lib/services/synthetic-dataset'

export type MetricMode = 'count' | 'risk' | 'cost'

interface IndiaStateMapProps {
  stateData: Record<string, StateAnalyticsItem>
  selectedState: string | null
  onSelectState: (stateName: string) => void
  metricMode: MetricMode
}

// Color interpolation helper
function interpolateColor(
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number
): string {
  const f = Math.max(0, Math.min(1, factor))
  const r = Math.round(color1[0] + f * (color2[0] - color1[0]))
  const g = Math.round(color1[1] + f * (color2[1] - color1[1]))
  const b = Math.round(color1[2] + f * (color2[2] - color1[2]))
  return `rgb(${r}, ${g}, ${b})`
}

interface MapLocation {
  id: string
  name: string
  path: string
}

export function IndiaStateMap({
  stateData,
  selectedState,
  onSelectState,
  metricMode,
}: IndiaStateMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Calculate maximum values for relative color scales
  const { maxCount, maxCost } = useMemo(() => {
    const items = Object.values(stateData)
    let mCount = 1
    let mCost = 1
    for (const item of items) {
      if (item.totalProjects > mCount) mCount = item.totalProjects
      if (item.totalSanctionedCostCr > mCost) mCost = item.totalSanctionedCostCr
    }
    return { maxCount: mCount, maxCost: mCost }
  }, [stateData])

  // Get choropleth fill color for a given state
  const getStateColor = (stateName: string): string => {
    const data = stateData[stateName]
    if (!data || data.totalProjects === 0) {
      return '#f1f5f9' // Neutral slate-100 for unmonitored / 0 projects
    }

    if (metricMode === 'count') {
      // PAIMANA gradient: Pale Cream/Gold (0) -> Amber (0.5) -> Crimson/Coral (1.0)
      const ratio = data.totalProjects / maxCount
      if (ratio < 0.5) {
        // From Cream (#fef3c7: 254, 243, 199) to Amber (#f59e0b: 245, 158, 11)
        return interpolateColor([254, 243, 199], [245, 158, 11], ratio * 2)
      } else {
        // From Amber (#f59e0b: 245, 158, 11) to Crimson (#be123c: 190, 18, 60)
        return interpolateColor([245, 158, 11], [190, 18, 60], (ratio - 0.5) * 2)
      }
    }

    if (metricMode === 'risk') {
      // ML Early-Warning Risk Tier proportion
      const criticalOrHigh = data.critical + data.high
      const riskRatio = data.totalProjects > 0 ? criticalOrHigh / data.totalProjects : 0
      if (riskRatio < 0.3) {
        return '#86efac' // Low risk: emerald-300
      } else if (riskRatio < 0.6) {
        return '#fde047' // Moderate risk: yellow-300
      } else if (riskRatio < 0.75) {
        return '#fb923c' // High risk: orange-400
      } else {
        return '#f43f5e' // Critical/Alarm: rose-500
      }
    }

    // metricMode === 'cost' (Capital Investment in ₹ Cr)
    const costRatio = Math.min(1, data.totalSanctionedCostCr / maxCost)
    // From Ice Blue (#e0f2fe: 224, 242, 254) to Deep Indigo (#1e3a8a: 30, 58, 138)
    return interpolateColor([224, 242, 254], [30, 58, 138], costRatio)
  }

  const activeHoveredData = hoveredState ? stateData[hoveredState] : null

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Map Container with PAIMANA-style soft gradient backdrop */}
      <div
        className="relative w-full max-w-[540px] aspect-[612/696] rounded-2xl bg-gradient-to-b from-sky-50/40 via-white to-slate-50/30 p-2 sm:p-4 flex items-center justify-center border border-slate-100/80 shadow-2xs"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseLeave={() => {
          setHoveredState(null)
          setMousePos(null)
        }}
      >
        <svg
          viewBox={IndiaMapData.viewBox}
          className="w-full h-full drop-shadow-xs"
          role="img"
          aria-label="Interactive India State Map"
        >
          <g>
            {IndiaMapData.locations.map((loc: MapLocation) => {
              const isSelected = selectedState?.toLowerCase() === loc.name.toLowerCase()
              const isHovered = hoveredState === loc.name
              const fill = getStateColor(loc.name)
              const hasProjects = !!stateData[loc.name]?.totalProjects

              return (
                <path
                  key={loc.id}
                  id={loc.id}
                  d={loc.path}
                  fill={fill}
                  stroke={isSelected ? '#0f172a' : isHovered ? '#2563eb' : '#94a3b8'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={`transition-all duration-150 ${
                    hasProjects ? 'cursor-pointer hover:opacity-95' : 'cursor-default'
                  }`}
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0 2px 6px rgba(15, 23, 42, 0.45))'
                      : isHovered
                      ? 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.35))'
                      : 'none',
                  }}
                  onClick={() => {
                    if (hasProjects) {
                      onSelectState(loc.name)
                    }
                  }}
                  onMouseEnter={() => setHoveredState(loc.name)}
                />
              )
            })}
          </g>
        </svg>

        {/* Vertical Color Scale Legend (PAIMANA Style) */}
        <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl p-2 shadow-sm flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
          <div className="flex flex-col justify-between h-36 py-0.5 text-right font-semibold">
            <span>
              {metricMode === 'count'
                ? maxCount
                : metricMode === 'risk'
                ? '100%'
                : `₹${(maxCost / 1000).toFixed(0)}k Cr`}
            </span>
            <span>
              {metricMode === 'count'
                ? Math.round(maxCount * 0.75)
                : metricMode === 'risk'
                ? '75%'
                : `₹${((maxCost * 0.75) / 1000).toFixed(0)}k Cr`}
            </span>
            <span>
              {metricMode === 'count'
                ? Math.round(maxCount * 0.5)
                : metricMode === 'risk'
                ? '50%'
                : `₹${((maxCost * 0.5) / 1000).toFixed(0)}k Cr`}
            </span>
            <span>
              {metricMode === 'count'
                ? Math.round(maxCount * 0.25)
                : metricMode === 'risk'
                ? '25%'
                : `₹${((maxCost * 0.25) / 1000).toFixed(0)}k Cr`}
            </span>
            <span>0</span>
          </div>

          {/* Color Gradient Strip */}
          <div
            className="w-3 h-36 rounded-md border border-slate-300 shadow-2xs"
            style={{
              background:
                metricMode === 'count'
                  ? 'linear-gradient(to bottom, #be123c, #f59e0b, #fef3c7)'
                  : metricMode === 'risk'
                  ? 'linear-gradient(to bottom, #f43f5e, #fb923c, #fde047, #86efac)'
                  : 'linear-gradient(to bottom, #1e3a8a, #2563eb, #38bdf8, #e0f2fe)',
            }}
          />
        </div>

        {/* Dynamic Hover Tooltip */}
        {hoveredState && mousePos && (
          <div
            className="pointer-events-none absolute z-20 bg-slate-900/95 backdrop-blur-xs text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-slate-700 space-y-1 min-w-[170px]"
            style={{
              left: `${Math.min(mousePos.x + 14, 320)}px`,
              top: `${Math.max(10, mousePos.y - 65)}px`,
            }}
          >
            <div className="font-bold text-slate-100 flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
              <span>{hoveredState}</span>
              {selectedState?.toLowerCase() === hoveredState.toLowerCase() && (
                <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {activeHoveredData ? (
              <div className="text-[11px] space-y-0.5 pt-0.5 text-slate-300">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Projects:</span>
                  <span className="font-mono font-semibold text-white">
                    {activeHoveredData.totalProjects}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Sanctioned:</span>
                  <span className="font-mono font-semibold text-white">
                    ₹{activeHoveredData.totalSanctionedCostCr.toLocaleString('en-IN')} Cr
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">High / Critical Risk:</span>
                  <span className="font-mono font-semibold text-rose-400">
                    {activeHoveredData.critical + activeHoveredData.high} (
                    {Math.round(
                      ((activeHoveredData.critical + activeHoveredData.high) /
                        activeHoveredData.totalProjects) *
                        100
                    )}
                    %)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic pt-0.5">
                No active projects recorded
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Hint Footer */}
      <div className="mt-2 text-center text-[11px] text-slate-500 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
        <span>Click on any state on the map to inspect project telemetry &amp; filter directory</span>
      </div>
    </div>
  )
}
