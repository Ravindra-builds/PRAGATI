'use client'

import React, { useState } from 'react'
import { ArrowUpDown, Building2 } from 'lucide-react'
import { SectorAnalyticsItem } from '@/lib/services/synthetic-dataset'

interface SectorRiskChartProps {
  sectors: SectorAnalyticsItem[]
  selectedSector: string
  onSelectSector: (sector: string) => void
}

type SortField = 'totalProjects' | 'criticalAndHigh' | 'avgCostRisk' | 'avgTimeRisk' | 'totalSanctionedCostCr'

export function SectorRiskChart({
  sectors,
  selectedSector,
  onSelectSector,
}: SectorRiskChartProps) {
  const [sortField, setSortField] = useState<SortField>('criticalAndHigh')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortedSectors = [...sectors].sort((a, b) => {
    let aVal = 0
    let bVal = 0
    if (sortField === 'totalProjects') {
      aVal = a.totalProjects
      bVal = b.totalProjects
    } else if (sortField === 'criticalAndHigh') {
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Risk by Infrastructure Sector
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              See where high-risk projects are concentrated.
            </p>
          </div>
        </div>
        {selectedSector !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectSector('ALL')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Clear Sector Filter ({selectedSector})
          </button>
        )}
      </div>

      {/* Visual Sector Bar Breakdown */}
      <div className="space-y-2.5">
        {sortedSectors.map((sec) => {
          const isSelected = selectedSector === sec.sector
          const criticalPct = (sec.critical / sec.totalProjects) * 100
          const highPct = (sec.high / sec.totalProjects) * 100
          const mediumPct = (sec.medium / sec.totalProjects) * 100
          const lowPct = (sec.low / sec.totalProjects) * 100

          return (
            <div
              key={sec.sector}
              onClick={() => onSelectSector(isSelected ? 'ALL' : sec.sector)}
              className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span>{sec.sector}</span>
                  <span className="text-[11px] font-mono text-slate-400 font-normal">
                    ({sec.totalProjects} projects &bull; ₹{sec.totalSanctionedCostCr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-rose-700 font-semibold">{sec.critical} Crit</span>
                  <span className="text-amber-700 font-semibold">{sec.high} High</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">Cost: {(sec.avgCostRisk * 100).toFixed(0)}%</span>
                  <span className="text-slate-600">Delay: {(sec.avgTimeRisk * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Segmented bar */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                {sec.critical > 0 && (
                  <div
                    style={{ width: `${criticalPct}%` }}
                    className="bg-rose-600 h-full"
                    title={`Critical: ${sec.critical} (${criticalPct.toFixed(0)}%)`}
                  />
                )}
                {sec.high > 0 && (
                  <div
                    style={{ width: `${highPct}%` }}
                    className="bg-amber-500 h-full"
                    title={`High: ${sec.high} (${highPct.toFixed(0)}%)`}
                  />
                )}
                {sec.medium > 0 && (
                  <div
                    style={{ width: `${mediumPct}%` }}
                    className="bg-yellow-400 h-full"
                    title={`Medium: ${sec.medium} (${mediumPct.toFixed(0)}%)`}
                  />
                )}
                {sec.low > 0 && (
                  <div
                    style={{ width: `${lowPct}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Low: ${sec.low} (${lowPct.toFixed(0)}%)`}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Sector</th>
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
                onClick={() => handleSort('criticalAndHigh')}
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
            {sortedSectors.map((sec) => {
              const isSelected = selectedSector === sec.sector
              return (
                <tr
                  key={sec.sector}
                  onClick={() => onSelectSector(isSelected ? 'ALL' : sec.sector)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 font-medium' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {sec.sector}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    {sec.totalProjects}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className="text-rose-700 font-bold">{sec.critical}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="text-amber-700 font-bold">{sec.high}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    {(sec.avgCostRisk * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    {(sec.avgTimeRisk * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">
                    ₹{sec.totalSanctionedCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
