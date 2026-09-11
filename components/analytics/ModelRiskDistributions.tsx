'use client'

import React from 'react'
import { IndianRupee, Clock, AlertTriangle } from 'lucide-react'
import { ProbabilityBucket } from '@/lib/services/synthetic-dataset'

interface ModelRiskDistributionsProps {
  costBuckets: ProbabilityBucket[]
  timeBuckets: ProbabilityBucket[]
}

export function ModelRiskDistributions({
  costBuckets,
  timeBuckets,
}: ModelRiskDistributionsProps) {
  const maxCostPct = Math.max(1, ...costBuckets.map((b) => b.percentage))
  const maxTimePct = Math.max(1, ...timeBuckets.map((b) => b.percentage))

  const getBucketColor = (range: string, type: 'cost' | 'time') => {
    if (range.includes('80 - 100%')) return 'bg-rose-600'
    if (range.includes('60 - 80%')) return type === 'cost' ? 'bg-orange-500' : 'bg-amber-500'
    if (range.includes('40 - 60%')) return 'bg-yellow-400'
    if (range.includes('20 - 40%')) return 'bg-blue-400'
    return 'bg-emerald-400'
  }

  // Projects with >=60% likelihood
  const highCostCount = (costBuckets[3]?.count || 0) + (costBuckets[4]?.count || 0)
  const highCostPct = Math.round(((costBuckets[3]?.percentage || 0) + (costBuckets[4]?.percentage || 0)) * 10) / 10

  const highTimeCount = (timeBuckets[3]?.count || 0) + (timeBuckets[4]?.count || 0)
  const highTimePct = Math.round(((timeBuckets[3]?.percentage || 0) + (timeBuckets[4]?.percentage || 0)) * 10) / 10

  return (
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
                What is driving cost risk?
              </h3>
              <p className="text-[11px] text-slate-500">
                Explore the project signals most associated with higher cost-overrun predictions.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            Logistic Regression
          </span>
        </div>

        {/* Insight summary */}
        <div className="bg-orange-50/70 border border-orange-200 rounded-lg p-2.5 text-xs text-orange-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>
              <strong>{highCostCount} projects ({highCostPct}%)</strong> have elevated predicted cost risk (&ge;60%).
            </span>
          </div>
        </div>

        {/* Histogram Bars */}
        <div className="pt-1">
          <div className="h-36 flex items-end justify-between gap-2 px-2 border-b border-slate-200 pb-1">
            {costBuckets.map((b) => {
              const heightPct = (b.percentage / maxCostPct) * 100
              const color = getBucketColor(b.range, 'cost')
              return (
                <div
                  key={b.range}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {b.count}
                  </span>
                  <div
                    style={{ height: `${Math.max(6, heightPct)}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${color} group-hover:brightness-110 relative flex items-center justify-center`}
                  >
                    {heightPct > 25 && (
                      <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
                        {b.percentage}%
                      </span>
                    )}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap font-mono shadow-md">
                    {b.range}: {b.count} projects ({b.percentage}%)
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

        {/* Breakdown Table */}
        <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-xs">
          {costBuckets.map((b) => (
            <div key={b.range} className="bg-slate-50 border border-slate-100 rounded-md p-1.5">
              <div className="text-[10px] text-slate-500 font-sans truncate">{b.range}</div>
              <div className="font-bold text-slate-800">{b.count}</div>
              <div className="text-[10px] text-slate-500">{b.percentage}%</div>
            </div>
          ))}
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
                What is driving schedule risk?
              </h3>
              <p className="text-[11px] text-slate-500">
                Explore the project signals most associated with higher delay predictions.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            Random Forest
          </span>
        </div>

        {/* Insight summary */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>{highTimeCount} projects ({highTimePct}%)</strong> have elevated predicted delay risk (&ge;60%).
            </span>
          </div>
        </div>

        {/* Histogram Bars */}
        <div className="pt-1">
          <div className="h-36 flex items-end justify-between gap-2 px-2 border-b border-slate-200 pb-1">
            {timeBuckets.map((b) => {
              const heightPct = (b.percentage / maxTimePct) * 100
              const color = getBucketColor(b.range, 'time')
              return (
                <div
                  key={b.range}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {b.count}
                  </span>
                  <div
                    style={{ height: `${Math.max(6, heightPct)}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${color} group-hover:brightness-110 relative flex items-center justify-center`}
                  >
                    {heightPct > 25 && (
                      <span className="text-[10px] font-mono font-bold text-white tracking-tighter">
                        {b.percentage}%
                      </span>
                    )}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap font-mono shadow-md">
                    {b.range}: {b.count} projects ({b.percentage}%)
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

        {/* Breakdown Table */}
        <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-xs">
          {timeBuckets.map((b) => (
            <div key={b.range} className="bg-slate-50 border border-slate-100 rounded-md p-1.5">
              <div className="text-[10px] text-slate-500 font-sans truncate">{b.range}</div>
              <div className="font-bold text-slate-800">{b.count}</div>
              <div className="text-[10px] text-slate-500">{b.percentage}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
