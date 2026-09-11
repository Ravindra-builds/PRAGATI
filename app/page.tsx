import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  AlertTriangle,
  Sparkles,
  BarChart2,
  FileCheck2,
  Clock,
  Compass,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200 py-16 sm:py-24">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-50/70 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl">
            {/* National SIH badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SIH 2026 Prototype &bull; Infrastructure Monitoring &amp; Decision Support</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              PRAGATI
            </h1>
            <p className="text-xl sm:text-2xl font-medium text-blue-900 mt-2 mb-4 tracking-tight">
              Predictive Infrastructure Monitoring &amp; Analytics
            </p>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              An institutional early warning intelligence system applying machine learning to
              PAIMANA/OCMS project-monitoring data. PRAGATI proactively identifies infrastructure
              projects at risk of budget overruns and schedule delays, isolates model-supported risk
              drivers, and helps monitoring authorities intervene early.
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all"
              >
                <span>Launch Portfolio Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-semibold transition-all shadow-xs"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Explore 850 Monitored Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Strip */}
      <section className="bg-slate-900 text-white py-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-400">850</div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Infrastructure Assets
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">8,174</div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Monitoring Snapshots
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">2 Dual-Target</div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Trained ML Models
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-400">10 Key Sectors</div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Central Ministries
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-700 mb-2">
              System Capabilities
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed for Institutional Decision Support
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              PRAGATI replaces retrospective reporting with prospective machine intelligence and explainability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Dual-Target Predictive ML
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trained separate binary classification models for Cost Overrun (Logistic Regression)
                and Schedule Delay (Random Forest) producing calibrated 0.00 – 1.00 risk probabilities.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                <ShieldCheck className="w-4 h-4" />
                <span>Strict Target Outcome Quarantine</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                SHAP Local Explainability
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every project prediction is decomposed using model-supported Shapley values, showing officials
                the top 5 factors driving elevated risk with unscaled observed project values.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <FileCheck2 className="w-4 h-4" />
                <span>Non-Causal Attribute Rankings</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Deterministic Early Warning Engine
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated heuristics detect physical-financial burn rate anomalies, milestone slippage ratios,
                and schedule deterioration to trigger actionable alerts for nodal officers.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <Clock className="w-4 h-4" />
                <span>Continuous Trajectory Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Portal Navigation Strip */}
      <section className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 sm:p-12 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                Active Monitoring Environment
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold">
                Access Central Infrastructure Portfolio
              </h3>
              <p className="text-slate-300 text-sm">
                Monitor 850 central sector projects across Road Transport, Railways, Petroleum, Power, and Water Resources.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-lg bg-white text-blue-950 font-semibold text-sm hover:bg-slate-100 transition-colors shadow-sm"
              >
                Open Dashboard
              </Link>
              <Link
                href="/dashboard/projects"
                className="px-5 py-2.5 rounded-lg bg-blue-800 text-white font-semibold text-sm hover:bg-blue-700 transition-colors border border-blue-700 shadow-sm"
              >
                Browse Projects
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
