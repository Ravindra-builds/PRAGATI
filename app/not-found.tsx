import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Layers,
  Bot,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-sky-50/40 via-slate-50/30 to-white">
      <div className="max-w-xl w-full text-center space-y-6 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-lg ring-1 ring-slate-900/5">
        {/* Emblem & Institutional Eyebrow */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative w-7 h-9 shrink-0 flex items-center justify-center">
            <Image
              src="/images/emblem.png"
              alt="State Emblem of India"
              width={28}
              height={36}
              className="object-contain"
            />
          </div>
          <div className="text-left border-l border-slate-200 pl-2.5">
            <div className="text-xs font-bold text-slate-900 leading-tight">PRAGATI PLATFORM</div>
            <div className="text-[10px] text-slate-500 leading-tight">Infrastructure Monitoring System</div>
          </div>
        </div>

        {/* 404 Display */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>HTTP 404 &bull; RESOURCE NOT FOUND</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Page Not Located
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            The project telemetry dossier, analytical workspace, or monitoring route you requested is unavailable or does not exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Portfolio Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition-all"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Explore 850 Projects</span>
          </Link>
          <Link
            href="/dashboard/assistant"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 text-xs font-semibold transition-all"
          >
            <Bot className="w-4 h-4 text-blue-600" />
            <span>Ask PRAGATI AI</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        {/* Suggested Routes Strip */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>Looking for something specific?</span>
          <div className="flex items-center gap-3 font-semibold text-blue-700">
            <Link href="/dashboard/analytics" className="hover:underline">Analytics</Link>
            <span>&bull;</span>
            <Link href="/dashboard/alerts" className="hover:underline">Early Warnings</Link>
            <span>&bull;</span>
            <Link href="/dashboard/assistant" className="hover:underline">AI Assistant</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
