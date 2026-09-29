'use client'

import React, { useState } from 'react'
import { IndianRupee, Clock, AlertTriangle, Info } from 'lucide-react'
import { ProbabilityBucket } from '@/lib/services/synthetic-dataset'

interface ModelRiskDistributionsProps {
  costBuckets: ProbabilityBucket[]
  timeBuckets: ProbabilityBucket[]
}

export function ModelRiskDistributions({
  costBuckets,
  timeBuckets,
}: ModelRiskDistributionsProps) {
  const [hoveredCostRange, setHoveredCostRange] = useState<string | null>(null)
  const [hoveredTimeRange, setHoveredTimeRange] = useState<string | null>(null)

  const maxCostPct = Math.max(1, ...costBuckets.map((b) => b.percentage))
  const maxTimePct = Math.max(1, ...timeBuckets.map((b) => b.percentage))

  const getBucketColor = (range: string, type: 'cost' | 'time') => {
    if (range.includes('80 - 100%')) return 'bg-rose-600'
    if (range.includes('60 - 80%')) return type === 'cost' ? 'bg-orange-500' : 'bg-amber-500'
    if (range.includes('40 - 60%')) return 'bg-yellow-400'
    if (range.includes('20 - 40%')) return 'bg-blue-400'
    return 'bg-emerald-400'
  }

  const getBucketTierLabel = (range: string) => {
    if (range.includes('80 - 100%')) return { label: 'Critical', dot: 'bg-rose-600' }
    if (range.includes('60 - 80%')) return { label: 'High Risk', dot: 'bg-orange-500' }
    if (range.includes('40 - 60%')) return { label: 'Moderate', dot: 'bg-yellow-400' }
    if (range.includes('20 - 40%')) return { label: 'Low Risk', dot: 'bg-blue-400' }
    return { label: 'Safe / Low', dot: 'bg-emerald-400' }
  }

  // Projects with >=60% likelihood
  const highCostCount = (costBuckets[3]?.count || 0) + (costBuckets[4]?.count || 0)
  const highCostPct =
    Math.round(((costBuckets[3]?.percentage || 0) + (costBuckets[4]?.percentage || 0)) * 10) / 10

  const highTimeCount = (timeBuckets[3]?.count || 0) + (timeBuckets[4]?.count || 0)
  const highTimePct =
    Math.round(((timeBuckets[3]?.percentage || 0) + (timeBuckets[4]?.percentage || 0)) * 10) / 10

  const activeCostBucket = costBuckets.find((b) => b.range === hoveredCostRange) || null
  const activeTimeBucket = timeBuckets.find((b) => b.range === hoveredTimeRange) || null

  return (
    <div className="space-y-3">
      {/* Simple Plain-English Guide Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">How to read these ML Risk Distribution Charts: </span>
            <span>
              Each bar groups portfolio projects by their <strong>predicted probability of overrun (0% to 100%)</strong>. The number inside a bar is the <strong>project count</strong>, and the top label is its <strong>% share of the portfolio</strong>. Projects in the <strong className="text-orange-700">60–80% (High)</strong> and <strong className="text-rose-700">80–100% (Critical)</strong> brackets require priority intervention.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Cost Risk Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Cost Overrun Probability Distribution
                </h3>
                <p className="text-[11px] text-slate-500">
                  Projects grouped by ML-predicted chance of exceeding sanctioned budget (hover any bar for details).
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              Logistic Regression
            </span>
          </div>

          {/* Instant 0ms Insight / Hover Callout */}
          <div className="bg-orange-50/70 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-950 flex items-center justify-between min-h-9">
            {activeCostBucket ? (
              <div className="flex items-center justify-between w-full font-mono">
                <span className="font-sans font-bold text-slate-900">
                  {getBucketTierLabel(activeCostBucket.range).label} Bracket ({activeCostBucket.range} overrun chance):
                </span>
                <span className="font-extrabold text-orange-800">
                  {activeCostBucket.count} projects ({activeCostBucket.percentage}% of portfolio)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>
                  <strong>{highCostCount} projects ({highCostPct}%)</strong> have high or critical predicted cost overrun risk (&ge;60% probability).
                </span>
              </div>
            )}
          </div>

          {/* Histogram Bars (Full Column Instant Hover) */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pb-1">
              <span>Y-Axis: Share of Portfolio (%) &amp; Project Count</span>
              <span>X-Axis: Predicted Cost Overrun Probability</span>
            </div>
            <div className="h-36 flex items-end justify-between gap-2 px-2 border-b border-slate-200 pb-1">
              {costBuckets.map((b) => {
                const heightPct = (b.percentage / maxCostPct) * 100
                const color = getBucketColor(b.range, 'cost')
                const isHovered = hoveredCostRange === b.range
                const isDimmed = hoveredCostRange !== null && !isHovered
                return (
                  <div
                    key={b.range}
                    onMouseEnter={() => setHoveredCostRange(b.range)}
                    onMouseLeave={() => setHoveredCostRange(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-1 cursor-pointer relative"
                  >
                    <span
                      className={`text-[10px] font-mono font-bold transition-opacity duration-75 ${
                        isHovered ? 'text-slate-900 opacity-100' : 'text-slate-500 opacity-85'
                      }`}
                    >
                      {b.percentage}%
                    </span>
                    <div
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                      className={`w-full rounded-t-md transition-all duration-100 ${color} flex items-center justify-center ${
                        isHovered ? 'brightness-110 ring-2 ring-slate-800/30' : isDimmed ? 'opacity-60' : ''
                      }`}
                    >
                      {heightPct > 28 && (
                        <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
                          {b.count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1.5 px-1">
              {costBuckets.map((b) => (
                <span key={b.range} className="flex-1 text-center truncate">
                  {b.range}
                </span>
              ))}
            </div>
          </div>

          {/* Breakdown Table with Risk Tier Labels */}
          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-xs">
            {costBuckets.map((b) => {
              const isHovered = hoveredCostRange === b.range
              const tier = getBucketTierLabel(b.range)
              return (
                <div
                  key={b.range}
                  onMouseEnter={() => setHoveredCostRange(b.range)}
                  onMouseLeave={() => setHoveredCostRange(null)}
                  className={`border rounded-md p-1.5 cursor-pointer transition-all duration-100 ${
                    isHovered
                      ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-400 -translate-y-0.5'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] font-sans font-semibold text-slate-700 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.dot}`} />
                    <span className="truncate">{tier.label}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans truncate">{b.range}</div>
                  <div className="font-bold text-slate-800 mt-0.5">{b.count}</div>
                  <div className="text-[10px] text-slate-500">{b.percentage}%</div>
                </div>
              )
            })}
          </div>

          {/* Key Cost Drivers Summary */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
            <span>
              <strong className="text-slate-700">Top Model Drivers:</strong> Financial vs. Physical Burn Gap, Budget Utilization Ratio, Delayed Milestones
            </span>
          </div>
        </div>

        {/* 2. Schedule Risk Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Schedule Delay Probability Distribution
                </h3>
                <p className="text-[11px] text-slate-500">
                  Projects grouped by ML-predicted chance of missing approved completion timeline (hover any bar for details).
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              Random Forest
            </span>
          </div>

          {/* Instant 0ms Insight / Hover Callout */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-950 flex items-center justify-between min-h-9">
            {activeTimeBucket ? (
              <div className="flex items-center justify-between w-full font-mono">
                <span className="font-sans font-bold text-slate-900">
                  {getBucketTierLabel(activeTimeBucket.range).label} Bracket ({activeTimeBucket.range} delay chance):
                </span>
                <span className="font-extrabold text-amber-800">
                  {activeTimeBucket.count} projects ({activeTimeBucket.percentage}% of portfolio)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong>{highTimeCount} projects ({highTimePct}%)</strong> have high or critical predicted schedule delay risk (&ge;60% probability).
                </span>
              </div>
            )}
          </div>

          {/* Histogram Bars (Full Column Instant Hover) */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pb-1">
              <span>Y-Axis: Share of Portfolio (%) &amp; Project Count</span>
              <span>X-Axis: Predicted Schedule Delay Probability</span>
            </div>
            <div className="h-36 flex items-end justify-between gap-2 px-2 border-b border-slate-200 pb-1">
              {timeBuckets.map((b) => {
                const heightPct = (b.percentage / maxTimePct) * 100
                const color = getBucketColor(b.range, 'time')
                const isHovered = hoveredTimeRange === b.range
                const isDimmed = hoveredTimeRange !== null && !isHovered
                return (
                  <div
                    key={b.range}
                    onMouseEnter={() => setHoveredTimeRange(b.range)}
                    onMouseLeave={() => setHoveredTimeRange(null)}
                    className="flex-1 h-full flex flex-col justify-end items-center gap-1 cursor-pointer relative"
                  >
                    <span
                      className={`text-[10px] font-mono font-bold transition-opacity duration-75 ${
                        isHovered ? 'text-slate-900 opacity-100' : 'text-slate-500 opacity-85'
                      }`}
                    >
                      {b.percentage}%
                    </span>
                    <div
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                      className={`w-full rounded-t-md transition-all duration-100 ${color} flex items-center justify-center ${
                        isHovered ? 'brightness-110 ring-2 ring-slate-800/30' : isDimmed ? 'opacity-60' : ''
                      }`}
                    >
                      {heightPct > 28 && (
                        <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
                          {b.count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1.5 px-1">
              {timeBuckets.map((b) => (
                <span key={b.range} className="flex-1 text-center truncate">
                  {b.range}
                </span>
              ))}
            </div>
          </div>

          {/* Breakdown Table with Risk Tier Labels */}
          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-xs">
            {timeBuckets.map((b) => {
              const isHovered = hoveredTimeRange === b.range
              const tier = getBucketTierLabel(b.range)
              return (
                <div
                  key={b.range}
                  onMouseEnter={() => setHoveredTimeRange(b.range)}
                  onMouseLeave={() => setHoveredTimeRange(null)}
                  className={`border rounded-md p-1.5 cursor-pointer transition-all duration-100 ${
                    isHovered
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400 -translate-y-0.5'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] font-sans font-semibold text-slate-700 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.dot}`} />
                    <span className="truncate">{tier.label}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans truncate">{b.range}</div>
                  <div className="font-bold text-slate-800 mt-0.5">{b.count}</div>
                  <div className="text-[10px] text-slate-500">{b.percentage}%</div>
                </div>
              )
            })}
          </div>

          {/* Key Schedule Drivers Summary */}
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
            <span>
              <strong className="text-slate-700">Top Model Drivers:</strong> Milestone Slippage Ratio, Elapsed Duration vs. Physical Progress Lag
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

