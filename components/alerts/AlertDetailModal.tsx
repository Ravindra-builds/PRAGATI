'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import {
  X,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Building2,
  Calendar,
  Layers,
  MapPin,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react'
import { RiskBadge, RiskTier } from '@/components/ui/RiskBadge'

export interface AlertDetailData {
  id: string
  projectId: string
  warningType: string
  severity: string
  title: string
  message: string
  createdAt: string | Date
  resolvedAt?: string | Date | null
  project?: {
    id?: string
    projectId: string
    name: string
    sector: string
    ministry: string
    implementingAgency: string
    state: string
    originalCostCr: number
    plannedDurationMonths: number
    status: string
  }
  projectUpdate?: {
    snapshotMonth: string
    elapsedMonths: number
    physicalProgressPct: number
    financialProgressPct: number
    expenditureCr: number
    milestonesTotal: number
    milestonesDelayed: number
    projectStatus: string
  }
  prediction?: {
    costOverrunProbability: number
    costPrediction: number
    timeOverrunProbability: number
    timePrediction: number
    overallRiskLevel: string
    costModelVersion: string
    timeModelVersion: string
  }
}

interface AlertDetailModalProps {
  alert: AlertDetailData | null
  isOpen: boolean
  onClose: () => void
}

export function AlertDetailModal({ alert, isOpen, onClose }: AlertDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !alert) return null

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'N/A'
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`
  }

  const formatDate = (val?: string | Date) => {
    if (!val) return 'Recent Snapshot'
    const d = new Date(val)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getWarningTypeLabel = (type: string) => {
    switch (type) {
      case 'COST_OVERRUN_RISK':
        return 'Cost Overrun Predictive Model'
      case 'SCHEDULE_DELAY_RISK':
        return 'Schedule Delay Predictive Model'
      case 'CRITICAL_MILESTONE_SLIPPAGE':
        return 'Milestone Slippage Tolerance Rule'
      case 'EXPENDITURE_BURN_ANOMALY':
        return 'Financial Burn Discrepancy Rule'
      default:
        return type.replace(/_/g, ' ')
    }
  }

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'COST_OVERRUN_RISK':
        return <TrendingUp className="w-5 h-5 text-rose-600" />
      case 'SCHEDULE_DELAY_RISK':
        return <Clock className="w-5 h-5 text-amber-600" />
      case 'CRITICAL_MILESTONE_SLIPPAGE':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'EXPENDITURE_BURN_ANOMALY':
        return <AlertCircle className="w-5 h-5 text-purple-600" />
      default:
        return <ShieldAlert className="w-5 h-5 text-blue-600" />
    }
  }

  // Calculate metrics for contextual display
  const burnGap =
    alert.projectUpdate
      ? alert.projectUpdate.financialProgressPct - alert.projectUpdate.physicalProgressPct
      : null

  const milestoneRatio =
    alert.projectUpdate && alert.projectUpdate.milestonesTotal > 0
      ? (alert.projectUpdate.milestonesDelayed / alert.projectUpdate.milestonesTotal) * 100
      : null

  const durationElapsedRatio =
    alert.project && alert.projectUpdate && alert.project.plannedDurationMonths > 0
      ? (alert.projectUpdate.elapsedMonths / alert.project.plannedDurationMonths) * 100
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden z-10">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
              {getWarningIcon(alert.warningType)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <RiskBadge level={alert.severity as RiskTier} size="md" />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  {getWarningTypeLabel(alert.warningType)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Detected: {formatDate(alert.createdAt)}
                </span>
              </div>
              <h2
                id="alert-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
              >
                {alert.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus:outline-hidden"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Summary Alert Message */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm leading-relaxed">
            <p className="font-medium text-slate-900 mb-1">Official Warning Synopsis</p>
            <p>{alert.message}</p>
          </div>

          {/* Project Profile Snapshot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700" />
                Associated Infrastructure Project
              </h3>
              <Link
                href={`/dashboard/projects/${alert.projectId}`}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 hover:underline"
              >
                Open Full Project Dossier
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-700">
                      {alert.projectId}
                    </span>
                    {alert.project?.status && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {alert.project.status}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {alert.project?.name || 'Infrastructure Project Package'}
                  </h4>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-500">Approved Sanction</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(alert.project?.originalCostCr)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Sector</span>
                  <span className="font-semibold text-slate-800">
                    {alert.project?.sector || 'General Infrastructure'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ministry</span>
                  <span className="font-semibold text-slate-800 line-clamp-1">
                    {alert.project?.ministry || 'Government of India'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Implementing Agency</span>
                  <span className="font-semibold text-slate-800">
                    {alert.project?.implementingAgency || 'State / Central PSU'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">State / UT</span>
                  <span className="font-semibold text-slate-800">
                    {alert.project?.state || 'National'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Why was this warning raised? (Model & Indicator Attribution) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-700" />
              Evidence &amp; Analytical Rationale
            </h3>

            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/40 border border-blue-100 space-y-4">
              {alert.warningType === 'COST_OVERRUN_RISK' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Cost Escalation Predictive ML Inference
                      </h4>
                      <p className="text-xs text-slate-600">
                        Inference pipeline: {alert.prediction?.costModelVersion || 'Logistic Regression (L2)'}
                      </p>
                    </div>
                    {alert.prediction && (
                      <div className="text-right">
                        <span className="text-2xl font-mono font-extrabold text-rose-600">
                          {(alert.prediction.costOverrunProbability * 100).toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Probability (50% decision threshold)
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The predictive model flag was triggered because observation-time financial indicators show expenditure acceleration outpacing milestone deliveries. Projects exhibiting this statistical signature have a historically high frequency of capital escalation.
                  </p>
                  {burnGap !== null && (
                    <div className="flex items-center gap-2 text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="font-semibold">Observed Discrepancy:</span>
                      <span>Financial burn ({alert.projectUpdate?.financialProgressPct.toFixed(1)}%) leads physical progress ({alert.projectUpdate?.physicalProgressPct.toFixed(1)}%) by</span>
                      <span className="font-mono font-bold text-rose-600">+{burnGap.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}

              {alert.warningType === 'SCHEDULE_DELAY_RISK' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Schedule Slippage Predictive ML Inference
                      </h4>
                      <p className="text-xs text-slate-600">
                        Inference pipeline: {alert.prediction?.timeModelVersion || 'Random Forest (150 trees)'}
                      </p>
                    </div>
                    {alert.prediction && (
                      <div className="text-right">
                        <span className="text-2xl font-mono font-extrabold text-amber-600">
                          {(alert.prediction.timeOverrunProbability * 100).toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Probability (50% decision threshold)
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The ensemble classification model detected temporal compression where remaining milestone schedules are insufficient given the historical pace of site execution.
                  </p>
                  {durationElapsedRatio !== null && (
                    <div className="flex items-center gap-2 text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="font-semibold">Duration Utilization:</span>
                      <span>{alert.projectUpdate?.elapsedMonths} of {alert.project?.plannedDurationMonths} approved months elapsed</span>
                      <span className="font-mono font-bold text-amber-600">({durationElapsedRatio.toFixed(1)}%)</span>
                    </div>
                  )}
                </div>
              )}

              {alert.warningType === 'CRITICAL_MILESTONE_SLIPPAGE' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Contractual Milestone Tolerance Breach
                    </h4>
                    <p className="text-xs text-slate-600">
                      Standard PAIMANA surveillance threshold: &ge;30% delayed milestones is an early warning; &ge;50% is critical.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-blue-100 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Total Milestones</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {alert.projectUpdate?.milestonesTotal || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Delayed Milestones</span>
                      <span className="text-base font-bold font-mono text-rose-600">
                        {alert.projectUpdate?.milestonesDelayed || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Slippage Ratio</span>
                      <span className="text-base font-bold font-mono text-rose-600">
                        {milestoneRatio !== null ? `${milestoneRatio.toFixed(0)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Over 30% of scheduled work packages are currently behind contractual target dates. Delay in critical-path activities poses compounding schedule risk for subsequent execution phases.
                  </p>
                </div>
              )}

              {alert.warningType === 'EXPENDITURE_BURN_ANOMALY' && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Disproportionate Financial Burn vs Physical Completion
                    </h4>
                    <p className="text-xs text-slate-600">
                      Surveillance threshold: Financial progress leading physical delivery by &ge;15.0%.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-blue-100 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Physical Progress</span>
                      <span className="text-base font-bold font-mono text-emerald-600">
                        {alert.projectUpdate ? `${alert.projectUpdate.physicalProgressPct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Financial Progress</span>
                      <span className="text-base font-bold font-mono text-blue-600">
                        {alert.projectUpdate ? `${alert.projectUpdate.financialProgressPct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 block">Discrepancy Gap</span>
                      <span className="text-base font-bold font-mono text-rose-600">
                        {burnGap !== null ? `+${burnGap.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Capital disbursements exceed verified physical works on site by a significant margin. This pattern often indicates front-loaded mobilization advances, equipment procurement delays, or potential cost escalation requiring verification with the field engineer.
                  </p>
                </div>
              )}

              {/* Observed Snapshot Indicators */}
              {alert.projectUpdate && (
                <div className="pt-2 border-t border-blue-100/80">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Snapshot Observation ({alert.projectUpdate.snapshotMonth})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white/80 p-2 rounded border border-blue-100/60">
                      <span className="text-slate-400 text-[10px] block">Cumulative Burn</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {formatCurrency(alert.projectUpdate.expenditureCr)}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-blue-100/60">
                      <span className="text-slate-400 text-[10px] block">Elapsed Duration</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {alert.projectUpdate.elapsedMonths} Months
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-blue-100/60">
                      <span className="text-slate-400 text-[10px] block">Physical Progress</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {alert.projectUpdate.physicalProgressPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-blue-100/60">
                      <span className="text-slate-400 text-[10px] block">Milestones Delayed</span>
                      <span className="font-mono font-semibold text-rose-600">
                        {alert.projectUpdate.milestonesDelayed} / {alert.projectUpdate.milestonesTotal}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Institutional Advisory Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-800">Automated Surveillance Notice: </span>
              This alert is generated by algorithmic rules and trained statistical estimators to assist project directors and monitoring officers in prioritizing on-site physical audits. It denotes empirical divergence and does not constitute a formal administrative penalty.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <Link
            href={`/dashboard/projects/${alert.projectId}`}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <span>Inspect Project Dossier</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
