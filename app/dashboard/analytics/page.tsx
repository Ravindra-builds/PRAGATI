'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader'
import { AnalyticsSummaryCards } from '@/components/analytics/AnalyticsSummaryCards'
import { PortfolioRiskSection } from '@/components/analytics/PortfolioRiskSection'
import { SectorRiskChart } from '@/components/analytics/SectorRiskChart'
import { MinistryAnalysisTable } from '@/components/analytics/MinistryAnalysisTable'
import { GeographicRiskTable } from '@/components/analytics/GeographicRiskTable'
import { FinancialPhysicalScatter } from '@/components/analytics/FinancialPhysicalScatter'
import { SchedulePhysicalScatter } from '@/components/analytics/SchedulePhysicalScatter'
import { ModelRiskDistributions } from '@/components/analytics/ModelRiskDistributions'
import { PortfolioRiskTrend } from '@/components/analytics/PortfolioRiskTrend'
import { ProjectComparisonTool } from '@/components/analytics/ProjectComparisonTool'
import { ModelPerformanceSection } from '@/components/analytics/ModelPerformanceSection'
import { AnalyticsPayload } from '@/lib/services/synthetic-dataset'
import { AlertTriangle } from 'lucide-react'

function AnalyticsContent() {
  const [ministry, setMinistry] = useState<string>('ALL')
  const [sector, setSector] = useState<string>('ALL')
  const [state, setState] = useState<string>('ALL')
  const [risk, setRisk] = useState<string>('ALL')

  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (ministry !== 'ALL') params.set('ministry', ministry)
      if (sector !== 'ALL') params.set('sector', sector)
      if (state !== 'ALL') params.set('state', state)
      if (risk !== 'ALL') params.set('risk', risk)

      const res = await fetch(`/api/analytics?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch analytics dataset')
      }

      setData(json.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [ministry, sector, state, risk])

  useEffect(() => {
    queueMicrotask(() => {
      fetchAnalytics()
    })
  }, [fetchAnalytics])

  const handleReset = () => {
    setMinistry('ALL')
    setSector('ALL')
    setState('ALL')
    setRisk('ALL')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-12">
      {/* 1. Header & Filter Bar */}
      <AnalyticsHeader
        ministry={ministry}
        setMinistry={setMinistry}
        sector={sector}
        setSector={setSector}
        state={state}
        setState={setState}
        risk={risk}
        setRisk={setRisk}
        ministryOptions={data?.filterOptions.ministries || []}
        sectorOptions={data?.filterOptions.sectors || []}
        stateOptions={data?.filterOptions.states || []}
        onReset={handleReset}
        onRefresh={fetchAnalytics}
        loading={loading}
      />

      {/* 2. Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="px-3 py-1 bg-white border border-rose-300 rounded-md font-semibold hover:bg-rose-100/50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200" />
            ))}
          </div>
          <div className="h-44 bg-slate-100 rounded-xl border border-slate-200" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-slate-100 rounded-xl border border-slate-200" />
            <div className="h-96 bg-slate-100 rounded-xl border border-slate-200" />
          </div>
        </div>
      )}

      {/* 4. Loaded Analytics Dashboard */}
      {data && (
        <div className="space-y-6">
          {/* A. Top KPIs */}
          <AnalyticsSummaryCards summary={data.summary} />

          {/* B. Risk Distribution Breakdown */}
          <PortfolioRiskSection
            distribution={data.riskDistribution}
            totalProjects={data.summary.totalProjects}
            activeRiskFilter={risk}
            onSelectRiskFilter={setRisk}
          />

          {/* C. Macro Temporal Execution Trajectory */}
          <PortfolioRiskTrend trend={data.temporalTrend} />

          {/* D. Interactive Scatter Visualizations (Financial Burn & Schedule Slippage) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <FinancialPhysicalScatter points={data.scatterPoints} />
            <SchedulePhysicalScatter points={data.scatterPoints} />
          </div>

          {/* E. Cost & Schedule Risk Distributions */}
          <ModelRiskDistributions
            costBuckets={data.costProbabilityBuckets}
            timeBuckets={data.timeProbabilityBuckets}
          />

          {/* F. Infrastructure Sector Analysis */}
          <SectorRiskChart
            sectors={data.bySector}
            selectedSector={sector}
            onSelectSector={setSector}
          />

          {/* G. Ministry & Geographic Breakdown Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MinistryAnalysisTable
              ministries={data.byMinistry}
              selectedMinistry={ministry}
              onSelectMinistry={setMinistry}
            />
            <GeographicRiskTable
              states={data.byState}
              selectedState={state}
              onSelectState={setState}
            />
          </div>

          {/* H. Side-by-Side Project Comparison Tool */}
          <ProjectComparisonTool projectList={data.projectList} />

          {/* I. Task 4 Model Validation Metrics & Transparency Notice */}
          <ModelPerformanceSection />
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500 font-medium">
          Loading PRAGATI Analytics Workspace...
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  )
}
