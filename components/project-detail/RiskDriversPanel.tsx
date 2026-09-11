'use client'

import React from 'react'
import { Info, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'

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
  title = 'Why is this project classified as elevated risk?',
  subtitle = 'Top model-supported feature contributions based on SHAP values from the predictive ML pipeline.',
}: RiskDriversPanelProps) {
  const items = drivers && drivers.length > 0 ? drivers.slice(0, 5) : []

  // Compute maximum absolute contribution to scale bars proportionally
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.contribution || 0)), 0.01)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            {title}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3 pt-2">
          {items.map((item, idx) => {
            const isIncrease = item.direction === 'increases_risk'
            const barWidth = Math.min(100, Math.max(8, (Math.abs(item.contribution) / maxAbs) * 100))

            return (
              <div
                key={item.feature + idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {item.display_name || item.feature}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.value !== undefined && item.value !== null && (
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        Observed: {typeof item.value === 'number' ? item.value.toFixed(2) : item.value}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isIncrease
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isIncrease ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-rose-600" />
                          <span>Increases Risk</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                          <span>Decreases Risk</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Magnitude contribution bar */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isIncrease ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 w-12 text-right">
                    {item.contribution > 0 ? `+${item.contribution.toFixed(3)}` : item.contribution.toFixed(3)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
          Click <span className="font-semibold text-blue-700">&quot;Run AI Prediction&quot;</span> above to compute real-time SHAP feature attribution.
        </div>
      )}

      {/* Non-causal institutional disclaimer */}
      <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
        <p>
          <strong className="font-semibold text-slate-700">Non-Causal Decision Support:</strong> Attribution
          weights represent model-supported statistical correlations (SHAP) across PAIMANA infrastructure patterns.
          They are intended to guide monitoring focus, not establish legal or contractor liability.
        </p>
      </div>
    </div>
  )
}
