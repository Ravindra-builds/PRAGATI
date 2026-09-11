'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Layers,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { RiskBadge, RiskTier } from '@/components/ui/RiskBadge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

interface ProjectItem {
  id: string
  projectId: string
  name: string
  ministry: string
  sector: string
  implementingAgency: string
  state: string
  originalCostCr: number
  plannedDurationMonths: number
  status: string
  latestUpdate: {
    snapshotMonth: string
    elapsedMonths: number
    physicalProgressPct: number
    financialProgressPct: number
    expenditureCr: number
    milestonesTotal: number
    milestonesDelayed: number
    projectStatus: string
  } | null
  latestPrediction: {
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    overallRiskLevel: string
  } | null
  activeWarningsCount: number
}

interface ProjectsResponse {
  total: number
  limit: number
  offset: number
  projects: ProjectItem[]
}

export default function ProjectsDirectoryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedRisk, setSelectedRisk] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', pageSize.toString())
      params.set('offset', ((page - 1) * pageSize).toString())

      if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim())
      if (selectedSector !== 'ALL') params.set('sector', selectedSector)
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus)
      if (selectedRisk !== 'ALL') params.set('risk', selectedRisk)

      const res = await fetch(`/api/projects?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to load projects (HTTP ${res.status})`)
      }
      const data: ProjectsResponse = await res.json()
      setProjects(data.projects || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Error connecting to projects API')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQuery, selectedSector, selectedStatus, selectedRisk])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const totalPages = Math.ceil(total / pageSize) || 1

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedSector('ALL')
    setSelectedStatus('ALL')
    setSelectedRisk('ALL')
    setPage(1)
  }

  const sectorsList = [
    'Petroleum and Natural Gas',
    'Power',
    'Railways',
    'Roads and Highways',
    'Shipping and Ports',
    'Urban Development',
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              National Projects Directory
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
              {total} Monitored Assets
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Comprehensive catalog of national infrastructure projects with live ML risk scores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchProjects()}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, project title, agency, or state..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Sector Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value)
                setPage(1)
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              aria-label="Filter by Sector"
            >
              <option value="ALL">All Sectors</option>
              {sectorsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value)
                setPage(1)
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              aria-label="Filter by Risk Tier"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Delayed">Delayed</option>
              <option value="Critical">Critical</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Active filters row */}
        {(debouncedQuery ||
          selectedSector !== 'ALL' ||
          selectedStatus !== 'ALL' ||
          selectedRisk !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing filtered results ({total} matching projects)
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could Not Retrieve Project Directory"
          message={error}
          retry={fetchProjects}
        />
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && projects.length === 0 ? (
          <TableSkeleton rows={10} />
        ) : projects.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Project ID</th>
                    <th className="py-3 px-4">Project Name &amp; Agency</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4 text-right">Sanctioned</th>
                    <th className="py-3 px-4 text-center">Progress (Phy / Fin)</th>
                    <th className="py-3 px-4 text-center">Risk Tier</th>
                    <th className="py-3 px-4 text-center">Cost Risk</th>
                    <th className="py-3 px-4 text-center">Time Risk</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {projects.map((proj) => {
                    const phy = proj.latestUpdate?.physicalProgressPct ?? 0
                    const fin = proj.latestUpdate?.financialProgressPct ?? 0
                    const costProb = proj.latestPrediction?.costOverrunProbability ?? 0
                    const timeProb = proj.latestPrediction?.timeOverrunProbability ?? 0
                    const riskTier = proj.latestPrediction?.overallRiskLevel || 'LOW'

                    return (
                      <tr
                        key={proj.projectId}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        {/* Project ID */}
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          <Link
                            href={`/dashboard/projects/${proj.projectId}`}
                            className="hover:underline"
                          >
                            {proj.projectId}
                          </Link>
                        </td>

                        {/* Title & Agency */}
                        <td className="py-3 px-4 max-w-xs">
                          <Link
                            href={`/dashboard/projects/${proj.projectId}`}
                            className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors block truncate"
                          >
                            {proj.name}
                          </Link>
                          <span className="text-[11px] text-slate-500 block truncate">
                            Agency: {proj.implementingAgency}
                          </span>
                        </td>

                        {/* Sector */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {proj.sector}
                        </td>

                        {/* State */}
                        <td className="py-3 px-4 text-slate-600">
                          {proj.state}
                        </td>

                        {/* Sanctioned Cost */}
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                          ₹{proj.originalCostCr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-emerald-700 font-semibold" title="Physical Progress">
                              {phy.toFixed(1)}%
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-blue-700 font-semibold" title="Financial Utilization">
                              {fin.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Risk Tier */}
                        <td className="py-3 px-4 text-center">
                          <RiskBadge level={riskTier as RiskTier} size="sm" />
                        </td>

                        {/* Cost Risk */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold ${
                              costProb >= 0.75
                                ? 'text-rose-600'
                                : costProb >= 0.5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {(costProb * 100).toFixed(0)}%
                          </span>
                        </td>

                        {/* Time Risk */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold ${
                              timeProb >= 0.75
                                ? 'text-rose-600'
                                : timeProb >= 0.5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {(timeProb * 100).toFixed(0)}%
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/dashboard/projects/${proj.projectId}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 group-hover:translate-x-0.5 transition-transform"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min((page - 1) * pageSize + 1, total)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(page * pageSize, total)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{total}</span>{' '}
                projects
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-medium">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No Matching Projects Found"
            description="Try adjusting your search keywords, sector, risk tier, or status filters."
            action={{
              label: 'Reset All Filters',
              onClick: handleResetFilters,
            }}
          />
        )}
      </div>
    </div>
  )
}
