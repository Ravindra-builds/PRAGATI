'use client'

import React from 'react'
import { Info, AlertCircle } from 'lucide-react'

export interface DriverItem {
  feature: string
  display_name: string
  value?: number | string | null
  contribution: number
  direction: 'increases_risk' | 'decreases_risk' | 'neutral'
}

interface RiskDriversPanelProps {
  drivers?: DriverItem[] | null
  title?: string
  subtitle?: string
}

export function RiskDriversPanel({
  drivers,
  title = 'Why this project is considered high risk',
  subtitle = 'Model-supported signals from the predictive model.',
}: RiskDriversPanelProps) {
  const items = drivers && drivers.length > 0 ? drivers.slice(0, 5) : []

  // Compute maximum absolute contribution to scale bars proportionally
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.contribution || 0)), 0.01)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            {title}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3 pt-1">
          {items.map((item, idx) => {
            const isIncrease = item.direction === 'increases_risk'
            const barWidth = Math.min(100, Math.max(8, (Math.abs(item.contribution) / maxAbs) * 100))

            return (
              <div
                key={item.feature + idx}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors space-y-2"
              >
                {/* Line 1: Rank & Feature Name */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {item.display_name || item.feature}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direction Badge */}
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isIncrease
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isIncrease ? '↑ Increases Risk' : '↓ Decreases Risk'}
                    </span>
                  </div>
                </div>

                {/* Line 2: Observed Value + Model Contribution */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                  {item.value !== undefined && item.value !== null && (
                    <span>
                      Observed Value:{' '}
                      <strong className="font-mono text-slate-800">
                        {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                      </strong>
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>
                    Model Contribution:{' '}
                    <strong className="font-mono text-slate-800">
                      {item.contribution > 0 ? `+${item.contribution.toFixed(3)}` : item.contribution.toFixed(3)}
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-400 text-[10px] uppercase font-medium">
                    Model-Supported Contributor
                  </span>
                </div>

                {/* Line 3: Magnitude Contribution Bar */}
                <div className="pt-0.5">
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isIncrease ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
          Click <span className="font-semibold text-blue-700">&quot;Assess Project Risk&quot;</span> above to compute real-time factor risk attribution.
        </div>
      )}

      {/* Non-causal institutional disclaimer */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
        <p>
          <strong className="font-semibold text-slate-700">Model-Supported Attribution:</strong> Drivers
          indicate statistical correlation patterns identified by trained estimators across PAIMANA infrastructure monitoring data.
          Intended to guide monitoring prioritization, not assign causal fault.
        </p>
      </div>
    </div>
  )
}
