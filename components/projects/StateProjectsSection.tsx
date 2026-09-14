'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Clock,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { StateAnalyticsItem } from '@/lib/services/synthetic-dataset'
import { IndiaStateMap, MetricMode } from './IndiaStateMap'

interface StateProjectsSectionProps {
  activeFilterState: string
  onSelectFilterState: (state: string) => void
}

export function StateProjectsSection({
  activeFilterState,
  onSelectFilterState,
}: StateProjectsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [metricMode, setMetricMode] = useState<MetricMode>('count')
  const [selectedState, setSelectedState] = useState<string>('Uttar Pradesh')
  const [stateList, setStateList] = useState<StateAnalyticsItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch portfolio state analytics
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data?.byState) {
          setStateList(json.data.byState)

          // If parent has active filter state, synchronize with it
          if (activeFilterState && activeFilterState !== 'ALL') {
            setSelectedState(activeFilterState)
          } else if (json.data.byState.length > 0) {
            // Default to top state by volume or Uttar Pradesh
            const hasUP = json.data.byState.some(
              (s: StateAnalyticsItem) => s.state.toLowerCase() === 'uttar pradesh'
            )
            setSelectedState(hasUP ? 'Uttar Pradesh' : json.data.byState[0].state)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load state analytics for map:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeFilterState])

  // Map state records by name for O(1) lookups
  const stateMap = useMemo(() => {
    const map: Record<string, StateAnalyticsItem> = {}
    for (const item of stateList) {
      map[item.state] = item
    }
    return map
  }, [stateList])

  const activeData: StateAnalyticsItem | undefined = stateMap[selectedState]

  // Handle map click
  const handleMapStateClick = (stateName: string) => {
    setSelectedState(stateName)
  }

  // Handle filter table action
  const handleFilterTable = () => {
    if (activeFilterState === selectedState) {
      onSelectFilterState('ALL')
    } else {
      onSelectFilterState(selectedState)
      // Smoothly scroll down to project directory table
      const el = document.getElementById('project-directory-table')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const isCurrentStateFiltered = activeFilterState === selectedState

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* Section Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              <span>State-wise Projects</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              as of July, 2026 &bull; MoSPI PAIMANA Baseline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Geographic distribution of monitored infrastructure assets, budget exposure, and ML early-warning risk concentration across Indian states.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Metric Mode Switcher */}
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setMetricMode('count')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'count'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              Project Count
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('risk')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'risk'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              AI Risk Exposure
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('cost')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                metricMode === 'cost'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900 text-slate-600'
              }`}
            >
              Capital (₹ Cr)
            </button>
          </div>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse Geographic Section' : 'Expand Geographic Section'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Collapse Map</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>View State Map</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Content Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Quick State Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Select State / UT for Detailed Telemetry:</span>
            </div>

            <div className="w-full sm:w-72">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                aria-label="Select state for telemetry card"
              >
                {stateList.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} ({s.totalProjects} {s.totalProjects === 1 ? 'project' : 'projects'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main 2-Column Grid: Left Card (PAIMANA Inspired) & Right India Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: PAIMANA-Inspired State Telemetry Card */}
            <div className="lg:col-span-6 flex flex-col justify-between h-full space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                {/* Card Title Banner (Institutional Navy Blue) */}
                <div className="bg-[#0f172a] text-white px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider block">
                      State Telemetry &amp; Intelligence Profile
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      <span>{selectedState}</span>
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950 text-blue-200 border border-blue-800">
                      {activeData?.totalProjects || 0} Assets
                    </span>
                  </div>
                </div>

                {/* 2x3 Metric Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {/* Tile 1: Project Count */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Project Count (No.)</span>
                      </span>
                      <span title="Total central infrastructure projects monitored in this state">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-slate-900">
                      {activeData?.totalProjects || 0}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Costing ₹150 Cr &amp; above
                    </div>
                  </div>

                  {/* Tile 2: Original Sanctioned Cost */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Original Cost (in Cr.)</span>
                      </span>
                      <span title="Sum of initial approved sanction budget across state projects">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
                      ₹ {(activeData?.totalSanctionedCostCr || 0).toLocaleString('en-IN', {
                        maximumFractionDigits: 1,
                      })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Initial approved sanction
                    </div>
                  </div>

                  {/* Tile 3: Cumulative Expenditure */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Expenditure (Cumm.) (in Cr.)</span>
                      </span>
                      <span title="Cumulative financial expenditure released and booked to date">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
                      ₹ {(activeData?.totalExpenditureCr || 0).toLocaleString('en-IN', {
                        maximumFractionDigits: 1,
                      })}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cumulative booked outlays
                    </div>
                  </div>

                  {/* Tile 4: High & Critical Risk (PRAGATI Intelligence) */}
                  <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-rose-800">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>High / Critical Risk (No.)</span>
                      </span>
                      <span title="Projects identified by dual ML models as carrying elevated overrun or delay probability">
                        <HelpCircle className="w-3 h-3 text-rose-400" />
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-rose-700 flex items-center gap-2">
                      <span>{(activeData?.critical || 0) + (activeData?.high || 0)}</span>
                      {activeData && activeData.totalProjects > 0 && (
                        <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                          {Math.round(
                            ((activeData.critical + activeData.high) / activeData.totalProjects) * 100
                          )}
                          %
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-rose-600 font-medium">
                      Requires active monitoring
                    </div>
                  </div>

                  {/* Tile 5: Average Physical Progress */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Avg Physical Progress</span>
                      </span>
                      <span title="Mean percentage of site works and milestone execution completed">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-slate-900">
                      {(activeData?.avgPhysicalProgress || 0).toFixed(1)} %
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Weighted ground delivery
                    </div>
                  </div>

                  {/* Tile 6: Average Financial Burn Gap */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>Expenditure Burn Gap</span>
                      </span>
                      <span title="Positive value indicates financial outlays are ahead of physical site delivery">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-mono font-extrabold ${
                        (activeData?.avgBurnGap || 0) > 10 ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      {(activeData?.avgBurnGap || 0) > 0 ? '+' : ''}
                      {(activeData?.avgBurnGap || 0).toFixed(1)} %
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Financial vs Physical delta
                    </div>
                  </div>
                </div>

                {/* Card Action Footer: Direct Project Directory Table Filtering */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    {isCurrentStateFiltered ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Directory currently filtered to {selectedState}
                      </span>
                    ) : (
                      <span>Click to filter the projects directory table below for this state</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleFilterTable}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 ${
                      isCurrentStateFiltered
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-blue-700 hover:bg-blue-800 text-white hover:shadow-sm'
                    }`}
                  >
                    {isCurrentStateFiltered ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset State Filter</span>
                      </>
                    ) : (
                      <>
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Directory for {selectedState}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Vector Map of India */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              {loading ? (
                <div className="w-full aspect-[612/696] rounded-2xl bg-slate-100 animate-pulse border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                  Loading geospatial telemetry...
                </div>
              ) : (
                <IndiaStateMap
                  stateData={stateMap}
                  selectedState={selectedState}
                  onSelectState={handleMapStateClick}
                  metricMode={metricMode}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
