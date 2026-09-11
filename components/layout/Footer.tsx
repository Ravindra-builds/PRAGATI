import React from 'react'
import Link from 'next/link'
import { Building2, Shield, Info, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: System info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-bold tracking-tight text-slate-900 text-sm">
                PRAGATI Monitoring Platform
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
              Predictive Infrastructure Monitoring &amp; Analytics is an AI-powered early warning
              decision support prototype developed for SIH 2026. Designed around PAIMANA and
              OCMS monitoring conventions, PRAGATI applies machine learning to identify cost escalation
              and schedule delay risks with local model explainability.
            </p>
          </div>

          {/* Col 2: Fast links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/dashboard" className="hover:text-blue-700 transition-colors">
                  Portfolio Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard/projects" className="hover:text-blue-700 transition-colors">
                  Projects Directory
                </Link>
              </li>
              <li>
                <Link href="/dashboard/analytics" className="hover:text-blue-700 transition-colors">
                  Portfolio Analytics
                </Link>
              </li>
              <li>
                <Link href="/dashboard/alerts" className="hover:text-blue-700 transition-colors">
                  Early Warning Alerts
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional Standards */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Compliance &amp; Standards
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Target Outcome Quarantine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>SHAP Local Explainability</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>MoSPI / PAIMANA Formats</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            &copy; 2026 PRAGATI Prototype &bull; Smart India Hackathon 2026 &bull; All Rights Reserved
          </p>
          <p className="text-[11px] text-slate-400 italic">
            * ML risk indicators represent predictive correlations for decision support, not causal attribution.
          </p>
        </div>
      </div>
    </footer>
  )
}
