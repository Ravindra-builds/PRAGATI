'use client'

import React, { useState, useMemo } from 'react'
import { Landmark, ArrowUpDown, Search } from 'lucide-react'
import { MinistryAnalyticsItem } from '@/lib/services/synthetic-dataset'

interface MinistryAnalysisTableProps {
  ministries: MinistryAnalyticsItem[]
  selectedMinistry: string
  onSelectMinistry: (ministry: string) => void
}

type SortField = 'totalProjects' | 'critical' | 'avgCostRisk' | 'avgTimeRisk' | 'totalSanctionedCostCr'

export function MinistryAnalysisTable({
  ministries,
  selectedMinistry,
  onSelectMinistry,
}: MinistryAnalysisTableProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('totalProjects')
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
    let list = ministries
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.ministry.toLowerCase().includes(q))
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
  }, [ministries, search, sortField, sortAsc])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Risk by Ministry / Department
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare the concentration of high-risk projects across ministries.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ministry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {selectedMinistry !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectMinistry('ALL')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline shrink-0"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 sticky top-0 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Central Ministry</th>
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
                  <span>Total Budget (₹ Cr)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  No ministries match the search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const isSelected = selectedMinistry === m.ministry
                return (
                  <tr
                    key={m.ministry}
                    onClick={() => onSelectMinistry(isSelected ? 'ALL' : m.ministry)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 font-medium' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {m.ministry}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {m.totalProjects}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className="text-rose-700 font-bold">{m.critical}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="text-amber-700 font-bold">{m.high}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {(m.avgCostRisk * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {(m.avgTimeRisk * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">
                      ₹{m.totalSanctionedCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
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
