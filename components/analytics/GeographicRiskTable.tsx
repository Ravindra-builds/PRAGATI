'use client'

import React, { useState, useMemo } from 'react'
import { MapPin, ArrowUpDown, Search } from 'lucide-react'
import { StateAnalyticsItem } from '@/lib/services/synthetic-dataset'

interface GeographicRiskTableProps {
  states: StateAnalyticsItem[]
  selectedState: string
  onSelectState: (state: string) => void
}

type SortField = 'totalProjects' | 'critical' | 'avgCostRisk' | 'avgTimeRisk' | 'totalSanctionedCostCr'

export function GeographicRiskTable({
  states,
  selectedState,
  onSelectState,
}: GeographicRiskTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('critical')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const filtered = useMemo(() => {
    let list = states
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.state.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      let aVal = 0
      let bVal = 0
      if (sortField === 'totalProjects') {
        aVal = a.totalProjects
        bVal = b.totalProjects
      } else if (sortField === 'critical') {
        aVal = a.critical + a.high
        bVal = b.critical + b.high
      } else if (sortField === 'avgCostRisk') {
        aVal = a.avgCostRisk
        bVal = b.avgCostRisk
      } else if (sortField === 'avgTimeRisk') {
        aVal = a.avgTimeRisk
        bVal = b.avgTimeRisk
      } else if (sortField === 'totalSanctionedCostCr') {
        aVal = a.totalSanctionedCostCr
        bVal = b.totalSanctionedCostCr
      }
      return sortAsc ? aVal - bVal : bVal - aVal
    })
  }, [states, search, sortField, sortAsc])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Risk by State
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              See where monitored project risk is concentrated geographically.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {selectedState !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectState('ALL')}
              className="px-2 py-1 rounded text-xs text-blue-600 hover:text-blue-800 bg-blue-50 shrink-0 cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 sticky top-0 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">State / UT</th>
              <th
                onClick={() => handleSort('totalProjects')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Projects</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('critical')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Crit / High</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgCostRisk')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Avg Cost Risk</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avgTimeRisk')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Avg Delay Risk</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('totalSanctionedCostCr')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Sanctioned (₹ Cr)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  No states match the search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isSelected = selectedState === s.state
                return (
                  <tr
                    key={s.state}
                    onClick={() => onSelectState(isSelected ? 'ALL' : s.state)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 font-medium' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {s.state}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {s.totalProjects}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className="text-rose-700 font-bold">{s.critical}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-amber-700 font-bold">{s.high}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {(s.avgCostRisk * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {(s.avgTimeRisk * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">
                      ₹{s.totalSanctionedCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
