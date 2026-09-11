'use client'

import React from 'react'
import {
  BarChart3,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'

interface AnalyticsHeaderProps {
  ministry: string
  setMinistry: (val: string) => void
  sector: string
  setSector: (val: string) => void
  state: string
  setState: (val: string) => void
  risk: string
  setRisk: (val: string) => void
  ministryOptions: string[]
  sectorOptions: string[]
  stateOptions: string[]
  onReset: () => void
  onRefresh: () => void
  loading: boolean
}

export function AnalyticsHeader({
  ministry,
  setMinistry,
  sector,
  setSector,
  state,
  setState,
  risk,
  setRisk,
  ministryOptions,
  sectorOptions,
  stateOptions,
  onReset,
  onRefresh,
  loading,
}: AnalyticsHeaderProps) {
  const isFiltered =
    ministry !== 'ALL' || sector !== 'ALL' || state !== 'ALL' || risk !== 'ALL'

  return (
    <div className="space-y-4 border-b border-slate-200 pb-5">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              SIH 2026 Prototype &bull; Synthetic Demo Data
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Portfolio Intelligence &bull; PAIMANA Alignment
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-700 shrink-0" />
            <span>Portfolio Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Explore portfolio risk patterns, spending trends, and schedule health across sectors, ministries, and states.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters:</span>
          </div>

          {/* Ministry Filter */}
          <div className="flex-1 min-w-[180px]">
            <select
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Filter by Ministry"
            >
              <option value="ALL">All Ministries</option>
              {ministryOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div className="flex-1 min-w-[180px]">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Filter by Sector"
            >
              <option value="ALL">All Sectors</option>
              {sectorOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="flex-1 min-w-[160px]">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Filter by State"
            >
              <option value="ALL">All States</option>
              {stateOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Tier Filter */}
          <div className="w-full sm:w-auto min-w-[140px]">
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              aria-label="Filter by Risk Tier"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical Risk Only</option>
              <option value="HIGH">High Risk Only</option>
              <option value="MEDIUM">Medium Risk Only</option>
              <option value="LOW">Low Risk Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
