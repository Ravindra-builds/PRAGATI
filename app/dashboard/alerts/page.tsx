'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  X,
  Info,
  LayoutDashboard,
  Layers,
} from 'lucide-react'
import { RiskBadge, RiskTier } from '@/components/ui/RiskBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { AlertDetailModal, AlertDetailData } from '@/components/alerts/AlertDetailModal'

interface AlertsSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  byType: Record<string, number>
}

interface AlertsApiResponse {
  total: number
  limit: number
  offset: number
  alerts: AlertDetailData[]
  summary: AlertsSummary
}

const SECTORS = [
  'ALL',
  'Petroleum and Natural Gas',
  'Railways',
  'Road Transport and Highways',
  'Power',
  'Renewable Energy',
  'Water and Sanitation',
]

const WARNING_TYPES = [
  { value: 'ALL', label: 'All Warning Rules' },
  { value: 'COST_OVERRUN_RISK', label: 'Cost Overrun Risk (ML)' },
  { value: 'SCHEDULE_DELAY_RISK', label: 'Schedule Delay Risk (ML)' },
  { value: 'CRITICAL_MILESTONE_SLIPPAGE', label: 'Milestone Slippage (Indicator)' },
  { value: 'EXPENDITURE_BURN_ANOMALY', label: 'Financial Burn Anomaly (Indicator)' },
]

function AlertsContent() {
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || ''

  // Filter States
  const [projectIdFilter, setProjectIdFilter] = useState<string>(initialProjectId)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL')
  const [selectedWarningType, setSelectedWarningType] = useState<string>('ALL')
  const [selectedSector, setSelectedSector] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  // Pagination & Data States
  const [page, setPage] = useState<number>(1)
  const limit = 15
  const [alerts, setAlerts] = useState<AlertDetailData[]>([])
  const [total, setTotal] = useState<number>(0)
  const [summary, setSummary] = useState<AlertsSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Detail Modal State
  const [activeModalAlert, setActiveModalAlert] = useState<AlertDetailData | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sync initial search param if URL updates
  const [prevInitialProjectId, setPrevInitialProjectId] = useState(initialProjectId)
  if (initialProjectId !== prevInitialProjectId) {
    setPrevInitialProjectId(initialProjectId)
    setProjectIdFilter(initialProjectId)
  }

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedSeverity !== 'ALL') params.set('severity', selectedSeverity)
      if (selectedWarningType !== 'ALL') params.set('warningType', selectedWarningType)
      if (selectedSector !== 'ALL') params.set('sector', selectedSector)
      if (projectIdFilter) params.set('projectId', projectIdFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)

      params.set('limit', limit.toString())
      params.set('offset', ((page - 1) * limit).toString())

      const res = await fetch(`/api/alerts?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }

      const json = await res.json()
      if (json.success && json.data) {
        const data: AlertsApiResponse = json.data
        setAlerts(data.alerts || [])
        setTotal(data.total || 0)
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        throw new Error(json.error?.message || 'Failed to retrieve early warnings')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error communicating with alerts service')
    } finally {
      setLoading(false)
    }
  }, [selectedSeverity, selectedWarningType, selectedSector, projectIdFilter, debouncedSearch, page])

  useEffect(() => {
    queueMicrotask(() => {
      fetchAlerts()
    })
  }, [fetchAlerts])

  const totalPages = Math.ceil(total / limit) || 1

  const handleResetFilters = () => {
    setSelectedSeverity('ALL')
    setSelectedWarningType('ALL')
    setSelectedSector('ALL')
    setSearchQuery('')
    setDebouncedSearch('')
    setProjectIdFilter('')
    setPage(1)
  }

  const handleSeverityCardClick = (sev: string) => {
    if (selectedSeverity === sev) {
      setSelectedSeverity('ALL')
    } else {
      setSelectedSeverity(sev)
    }
    setPage(1)
  }

  const formatDate = (val?: string | Date) => {
    if (!val) return 'Recent'
    const d = new Date(val)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getWarningTypeMeta = (type: string) => {
    switch (type) {
      case 'COST_OVERRUN_RISK':
        return {
          label: 'Cost Overrun Risk',
          icon: <TrendingUp className="w-3.5 h-3.5 text-rose-600" />,
          pillClass: 'bg-rose-50 text-rose-700 border-rose-200',
        }
      case 'SCHEDULE_DELAY_RISK':
        return {
          label: 'Schedule Delay Risk',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
        }
      case 'CRITICAL_MILESTONE_SLIPPAGE':
        return {
          label: 'Milestone Slippage',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />,
          pillClass: 'bg-orange-50 text-orange-700 border-orange-200',
        }
      case 'EXPENDITURE_BURN_ANOMALY':
        return {
          label: 'Burn Rate Anomaly',
          icon: <AlertCircle className="w-3.5 h-3.5 text-purple-600" />,
          pillClass: 'bg-purple-50 text-purple-700 border-purple-200',
        }
      default:
        return {
          label: type.replace(/_/g, ' '),
          icon: <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />,
          pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
        }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              SIH 2026 Prototype &bull; Synthetic Demo Data
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Surveillance Engine v1.0
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
            <span>Early Warning Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Continuous surveillance triage for central monitoring officials. Synthesizes predictive ML probabilities and PAIMANA indicator distress signals to prioritize project intervention.
          </p>
        </div>

        {/* Action links */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Projects</span>
          </Link>
          <button
            type="button"
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            title="Refresh alerts data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Project Filter Banner if navigating from a project detail */}
      {projectIdFilter && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-blue-900">
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Showing early warnings filtered for project{' '}
              <strong className="font-mono text-blue-950 font-bold">{projectIdFilter}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setProjectIdFilter('')
              setPage(1)
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-blue-100 text-blue-800 font-semibold border border-blue-300 text-[11px] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All Projects</span>
          </button>
        </div>
      )}

      {/* KPI Cards: Total, Critical, High, Medium, Low */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Active Warnings */}
        <button
          type="button"
          onClick={() => handleSeverityCardClick('ALL')}
          className={`text-left p-4 rounded-xl border transition-all duration-150 ${
            selectedSeverity === 'ALL'
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Total Active</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-slate-900">
            {summary ? summary.total : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Portfolio wide alerts
          </div>
        </button>

        {/* Critical Severity */}
        <button
          type="button"
          onClick={() => handleSeverityCardClick('CRITICAL')}
          className={`text-left p-4 rounded-xl border transition-all duration-150 ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
              : 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Critical</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-rose-950">
            {summary ? summary.critical : '—'}
          </div>
          <div className="mt-1 text-[11px] text-rose-700">
            Immediate intervention
          </div>
        </button>

        {/* High Severity */}
        <button
          type="button"
          onClick={() => handleSeverityCardClick('HIGH')}
          className={`text-left p-4 rounded-xl border transition-all duration-150 ${
            selectedSeverity === 'HIGH'
              ? 'bg-orange-100/70 border-orange-400 ring-2 ring-orange-500/30 shadow-xs'
              : 'bg-orange-50/40 border-orange-200/80 hover:border-orange-300 hover:bg-orange-50/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-orange-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>High</span>
            </div>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-orange-950">
            {summary ? summary.high : '—'}
          </div>
          <div className="mt-1 text-[11px] text-orange-700">
            Escalation watchlist
          </div>
        </button>

        {/* Medium Severity */}
        <button
          type="button"
          onClick={() => handleSeverityCardClick('MEDIUM')}
          className={`text-left p-4 rounded-xl border transition-all duration-150 ${
            selectedSeverity === 'MEDIUM'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/30 shadow-xs'
              : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Medium</span>
            </div>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-amber-950">
            {summary ? summary.medium : '—'}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">
            Indicator deviation
          </div>
        </button>

        {/* Low Severity */}
        <button
          type="button"
          onClick={() => handleSeverityCardClick('LOW')}
          className={`text-left p-4 rounded-xl border transition-all duration-150 col-span-2 sm:col-span-1 ${
            selectedSeverity === 'LOW'
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
              : 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-50/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Low</span>
            </div>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-mono font-extrabold text-emerald-950">
            {summary ? summary.low : '—'}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Baseline monitored
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project ID, title, agency, or keyword..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Warning Type Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedWarningType}
              onChange={(e) => {
                setSelectedWarningType(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {WARNING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Dropdown */}
          <div className="w-full md:w-52">
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Sectors</option>
              {SECTORS.filter((s) => s !== 'ALL').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {(selectedSeverity !== 'ALL' ||
            selectedWarningType !== 'ALL' ||
            selectedSector !== 'ALL' ||
            searchQuery ||
            projectIdFilter) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Results count header */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{alerts.length}</strong> of{' '}
            <strong className="text-slate-800">{total}</strong> early warnings
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Main Alert Feed Content */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} retry={fetchAlerts} />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No Early Warnings Found"
          description="No project alerts match the current filter criteria or search query. Adjust filters or search parameters to inspect other warnings."
          action={{
            label: 'Clear All Filters',
            onClick: handleResetFilters,
          }}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((w) => {
            const typeMeta = getWarningTypeMeta(w.warningType)
            const burnGap =
              w.projectUpdate
                ? w.projectUpdate.financialProgressPct - w.projectUpdate.physicalProgressPct
                : null

            return (
              <div
                key={w.id}
                className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 space-y-3"
              >
                {/* Header: Title prominent, Severity badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={w.severity as RiskTier} size="sm" />
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${typeMeta.pillClass}`}
                      >
                        {typeMeta.icon}
                        <span>{typeMeta.label}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Detected: {formatDate(w.createdAt)}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                      {w.title}
                    </h2>
                  </div>

                  {/* Right quick actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => setActiveModalAlert(w)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <span>Why this was raised</span>
                    </button>
                    <Link
                      href={`/dashboard/projects/${w.projectId}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Inspect Project</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Subtitle Line: Project ID, Name, Sector, Agency, State */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <Link
                    href={`/dashboard/projects/${w.projectId}`}
                    className="font-mono font-bold text-blue-700 hover:underline hover:text-blue-900"
                  >
                    {w.projectId}
                  </Link>
                  <span className="text-slate-300">&bull;</span>
                  <span className="font-semibold text-slate-800 line-clamp-1">
                    {w.project?.name || 'Infrastructure Package'}
                  </span>
                  {w.project?.sector && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-600">{w.project.sector}</span>
                    </>
                  )}
                  {w.project?.implementingAgency && (
                    <>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-500 font-medium">
                        {w.project.implementingAgency} ({w.project.state})
                      </span>
                    </>
                  )}
                </div>

                {/* Warning message description */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {w.message}
                </p>

                {/* Metric pill indicators depending on warning type */}
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                  {w.prediction && w.warningType === 'COST_OVERRUN_RISK' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[11px]">
                      <span className="font-semibold">Cost Overrun Risk:</span>
                      <span className="font-bold">
                        {(w.prediction.costOverrunProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {w.prediction && w.warningType === 'SCHEDULE_DELAY_RISK' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]">
                      <span className="font-semibold">Delay Risk:</span>
                      <span className="font-bold">
                        {(w.prediction.timeOverrunProbability * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {w.projectUpdate && w.warningType === 'CRITICAL_MILESTONE_SLIPPAGE' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-50 text-orange-800 border border-orange-200 font-mono text-[11px]">
                      <span className="font-semibold">Milestones Delayed:</span>
                      <span className="font-bold">
                        {w.projectUpdate.milestonesDelayed} / {w.projectUpdate.milestonesTotal} (
                        {(
                          (w.projectUpdate.milestonesDelayed /
                            (w.projectUpdate.milestonesTotal || 1)) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                  )}

                  {burnGap !== null && w.warningType === 'EXPENDITURE_BURN_ANOMALY' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono text-[11px]">
                      <span className="font-semibold">Burn Rate Discrepancy:</span>
                      <span className="font-bold">+{burnGap.toFixed(1)}%</span>
                      <span className="text-[10px] text-purple-600">
                        (Fin: {w.projectUpdate?.financialProgressPct.toFixed(1)}% vs Phy:{' '}
                        {w.projectUpdate?.physicalProgressPct.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-slate-600 font-medium">
            Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span>
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detailed Explanation Modal */}
      <AlertDetailModal
        alert={activeModalAlert}
        isOpen={!!activeModalAlert}
        onClose={() => setActiveModalAlert(null)}
      />
    </div>
  )
}

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading Early Warning Center...</p>
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  )
}
