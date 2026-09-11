import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Layers,
  AlertTriangle,
  BarChart2,
  FileCheck2,
  Clock,
  LayoutDashboard,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Compact Institutional Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              <span>SIH 2026 Prototype &bull; Infrastructure Monitoring &amp; Decision Support</span>
            </div>

            {/* Main Product Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              PRAGATI
            </h1>
            <p className="text-base sm:text-lg font-semibold text-slate-700 mt-1.5 tracking-tight">
              Predictive Infrastructure Monitoring &amp; Analytics
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-2.5 leading-relaxed">
              An institutional early warning intelligence system applying dual-target machine learning to
              PAIMANA/OCMS project monitoring data. Identifies infrastructure projects approaching
              cost escalation and schedule delay thresholds with local model explainability.
            </p>

            {/* CTA Buttons */}
            <div className="mt-5 flex flex-wrap gap-3 items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Launch Portfolio Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-xs"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Explore 850 Monitored Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Strip */}
      <section className="bg-slate-900 text-white py-4 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">850</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Monitored Assets
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">8,174</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Monthly Snapshots
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">Dual-Target</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Trained ML Models
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-400">6 Key Sectors</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                Central Ministries
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-8 sm:py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-1">
              System Architecture
            </h2>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Institutional Decision Support Capabilities
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Proactive machine learning and local explainability built around PAIMANA monitoring conventions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                Dual-Target Predictive ML
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Separate binary classification models for Cost Overrun (Logistic Regression)
                and Schedule Delay (Random Forest) producing calibrated 0.00 – 1.00 risk probabilities.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Target Outcome Quarantine Enforced</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                SHAP Local Explainability
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Model predictions are decomposed using Shapley values, surfacing top risk drivers
                with observed project values and clear directional indicators.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Model-Supported Factor Rankings</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                Early Warning Decision Rules
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deterministic rules evaluate financial-physical burn gaps, milestone slippage ratios,
                and duration elapsed to surface prioritized warning candidates.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <Clock className="w-3.5 h-3.5" />
                <span>Continuous Trajectory Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Portal Navigation Strip */}
      <section className="bg-white py-8 sm:py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-6 sm:p-8 text-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                Interactive Decision Support
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">
                Access Central Infrastructure Portfolio
              </h3>
              <p className="text-slate-300 text-xs">
                Explore monitored projects across Petroleum, Power, Railways, Roads, Shipping, and Urban Development.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-white text-blue-950 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs"
              >
                Open Dashboard
              </Link>
              <Link
                href="/dashboard/projects"
                className="px-4 py-2 rounded-lg bg-blue-800 text-white font-semibold text-xs hover:bg-blue-700 transition-colors border border-blue-700 shadow-xs"
              >
                Browse Directory
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
