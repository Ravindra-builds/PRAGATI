'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  PlayCircle,
  AlertTriangle,
  Target,
  LayoutDashboard,
  Bot,
  ArrowRight,
  Layers,
  Building2,
  LayoutGrid,
  Coins,
  TrendingUp,
  Wallet,
  ShieldCheck,
  BarChart2,
  FileCheck2,
  Clock,
  X,
  ExternalLink,
  CheckCircle2,
  Database,
  Cpu,
  BrainCircuit,
  ShieldAlert,
  Sparkles,
  Terminal,
  Send,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react'

interface TerminalHistoryItem {
  command: string
  output: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
}

export default function HomePage() {
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [activeDemoStep, setActiveDemoStep] = useState(0)
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0)

  // Interactive Terminal State
  const [terminalInput, setTerminalInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [terminalLogs, setTerminalLogs] = useState<TerminalHistoryItem[]>([
    {
      command: 'pragati --version',
      output: `PRAGATI Telemetry Engine v1.0.0 (MoSPI PAIMANA / OCMS Standards Alignment)
Type 'pragati --help' or click [--help] to list available commands.`,
      type: 'info',
      timestamp: 'READY',
    },
  ])
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const terminalInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight
    }
  }, [terminalLogs])

  const executeCommand = (cmdText: string) => {
    const raw = cmdText.trim()
    if (!raw) return

    setCommandHistory((prev) => [...prev, raw])
    setHistoryIndex(-1)
    setTerminalInput('')

    const clean = raw.toLowerCase()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    if (clean === 'clear' || clean === 'cls') {
      setTerminalLogs([])
      return
    }

    if (clean === 'pragati --help' || clean === '--help' || clean === 'help' || clean === 'pragati') {
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `PRAGATI CLI — National Infrastructure Predictive Telemetry Engine v1.0.0
MoSPI PAIMANA & OCMS Standards Alignment • Dual-Target ML Engine

USAGE:
  pragati <command> [options]

AVAILABLE COMMANDS:
  pragati --help                Display command manual and available subcommands
  pragati ingest --sample       Ingest & standardize MoSPI PAIMANA monthly telemetry
  pragati predict PRJ-0042      Execute dual-target ML inference (Cost & Schedule Delay)
  pragati explain PRJ-0042      Decompose local SHAP feature attributions & risk drivers
  pragati alerts                Query active pre-critical early warnings & burn gaps
  pragati ask "<question>"      Query grounded PRAGATI AI assistant on portfolio data
  pragati stats                 Display national portfolio outlay & sector breakdown
  clear                         Clear terminal console screen`,
          type: 'info',
          timestamp: now,
        },
      ])
      return
    }

    if (clean.includes('ingest')) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[INGEST] Ingesting MoSPI PAIMANA & OCMS Monthly Project Records...
✓ Parsed 850 central infrastructure assets across 17 central ministries.
✓ Validated 100% schema constraints. Target outcome quarantine strictly enforced.
✓ Standardized cumulative expenditure: ₹ 20,36,412.50 Cr against ₹ 37,13,890.00 Cr sanctioned.
✓ Telemetry snapshot status: SYNCHRONIZED & READY FOR ML INFERENCE.`,
          type: 'success',
          timestamp: now,
        },
      ])
      setSelectedWorkflowStep(0)
      return
    }

    if (clean.includes('predict')) {
      const match = raw.match(/PRJ-\d+/i)
      const projId = match ? match[0].toUpperCase() : 'PRJ-0042'
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[PREDICT] Executing Dual-Target ML Inference for ${projId}...
─────────────────────────────────────────────────────────────────────────────
• Target 1: Cost Overrun Risk     → 0.74 (HIGH RISK)     [Calibrated Logistic Regression]
• Target 2: Schedule Delay Risk   → 0.68 (MEDIUM-HIGH)   [Tuned Random Forest]
• Composite Risk Index            → HIGH (0.71 Overall)
• Financial-Physical Burn Gap     → 12.3% Divergence (Spend: 75.2% vs Site Progress: 62.9%)
─────────────────────────────────────────────────────────────────────────────
✓ Calibration status: Probability boundaries verified in [0.00, 1.00].
✓ Recommendation: Priority ministerial surveillance required.`,
          type: 'warning',
          timestamp: now,
        },
      ])
      setSelectedWorkflowStep(1)
      return
    }

    if (clean.includes('explain') || clean.includes('shap')) {
      const match = raw.match(/PRJ-\d+/i)
      const projId = match ? match[0].toUpperCase() : 'PRJ-0042'
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[SHAP] Local Feature Attribution Decomposition for ${projId}:
─────────────────────────────────────────────────────────────────────────────
Rank  Feature Driver                     SHAP Value  Direction Impact
[01]  Financial Burn Gap (>10%)          +0.312      ↑ Accelerates Overrun Risk
[02]  Elapsed Duration Ratio (81.0%)      +0.244      ↑ Compounding Schedule Delay
[03]  Critical Milestone Slippage (38%)  +0.189      ↑ Civil Works Bottleneck
[04]  Contractor Execution History       -0.125      ↓ Mitigating Factor
─────────────────────────────────────────────────────────────────────────────
Base Value E[f(x)] = 0.320 | Model Prediction f(x) = 0.740 (Net Shift: +0.420)`,
          type: 'info',
          timestamp: now,
        },
      ])
      setSelectedWorkflowStep(2)
      return
    }

    if (clean.includes('alert')) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[ALERTS] Active Portfolio Early Warning Triggers (Total: 28 Active Alerts):
─────────────────────────────────────────────────────────────────────────────
• [CRITICAL] PRJ-0042 (Western DFC)       : Financial burn gap (12.3%) outpaces site progress
• [HIGH]     PRJ-0118 (NH-44 Expressway)  : 38% critical path milestones delayed > 90 days
• [HIGH]     PRJ-0205 (Kudankulam Unit 3) : Milestone slippage ratio = 0.42
• [MEDIUM]   PRJ-0341 (Mumbai Metro L4)   : Elapsed duration (78%) outpaces civil completion (61%)
─────────────────────────────────────────────────────────────────────────────
✓ Full early warning logs and resolution workflows available at /dashboard/alerts`,
          type: 'warning',
          timestamp: now,
        },
      ])
      setSelectedWorkflowStep(2)
      return
    }

    if (clean.includes('ask') || clean.includes('ai') || clean.includes('chat')) {
      const question = raw.replace(/^pragati\s+ask\s+/i, '').replace(/["']/g, '').trim()
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[PRAGATI AI] Query: "${question || 'Why is PRJ-0042 flagged with High Cost Risk?'}"
─────────────────────────────────────────────────────────────────────────────
"PRJ-0042 (Western Dedicated Freight Corridor) has incurred ₹38,650.00 Cr (75.2% of sanctioned budget) against physical completion of 62.9%, creating an anomalous 12.3% burn gap. Local SHAP attribution confirms this financial-physical divergence (+0.31) and remaining critical civil milestones (+0.24) are the primary drivers for the 0.74 Cost Overrun probability."`,
          type: 'info',
          timestamp: now,
        },
      ])
      setSelectedWorkflowStep(3)
      return
    }

    if (clean.includes('stat')) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          command: raw,
          output: `[PORTFOLIO STATS] National Infrastructure Portfolio Summary:
─────────────────────────────────────────────────────────────────────────────
• Total Monitored Projects : 850 Assets (₹150 Cr & Above)
• Central Ministries       : 17 Ministries (Railways, MoRTH, Power, Shipping, etc.)
• Key Sectors              : 6 Sectors
• Original Sanctioned Cost : ₹ 37,13,890.00 Cr
• Revised Sanctioned Cost  : ₹ 42,78,120.00 Cr (+15.2% Cost Escalation)
• Cumulative Expenditure   : ₹ 20,36,412.50 Cr (54.8% Outlay Realized)
• Portfolio Risk Breakdown : 142 High Risk | 318 Medium Risk | 390 Low Risk`,
          type: 'success',
          timestamp: now,
        },
      ])
      return
    }

    // Default unrecognized
    setTerminalLogs((prev) => [
      ...prev,
      {
        command: raw,
        output: `Command not recognized: '${raw}'
Type 'pragati --help' to view available commands.`,
        type: 'error',
        timestamp: now,
      },
    ])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(terminalInput)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex
        setHistoryIndex(nextIdx)
        setTerminalInput(commandHistory[commandHistory.length - 1 - nextIdx] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1
        setHistoryIndex(nextIdx)
        setTerminalInput(commandHistory[commandHistory.length - 1 - nextIdx] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setTerminalInput('')
      }
    }
  }

  const workflowSteps = [
    {
      stepNumber: '1',
      badge: 'Step 01 • Data Layer',
      icon: Database,
      accentColor: 'from-cyan-600 to-blue-600',
      badgeColor: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      headline: 'Ingest & Standardize. Real-Time Telemetry Pipeline.',
      description:
        'Continuous ingestion of monthly project snapshots across 850 infrastructure assets, standardizing expenditure, physical progress, and milestone schedules across formats.',
      bullets: [
        'Automated parsing of MoSPI PAIMANA & OCMS datasets',
        'Ingests physical progress, financial expenditure & milestones',
        'Strict target outcome quarantine to eliminate data leakage',
        'Data Lab drag-and-drop support for PDF, XLSX, & CSV',
      ],
      ctaText: 'Explore Data Lab & Projects',
      ctaHref: '/dashboard/data-lab',
      terminalCmd: 'pragati ingest --sample',
    },
    {
      stepNumber: '2',
      badge: 'Step 02 • ML Intelligence',
      icon: Cpu,
      accentColor: 'from-blue-600 to-indigo-600',
      badgeColor: 'border-blue-200 bg-blue-50 text-blue-800',
      headline: 'Forecast Risk. Dual-Target ML Classification.',
      description:
        'Independent binary classification models compute calibrated probability scores for Cost Overrun (Logistic Regression) and Schedule Delay (Random Forest) months before escalation.',
      bullets: [
        'Dual-target models: Cost Overrun & Schedule Delay',
        'Calibrated risk probability scoring (0.00 – 1.00 index)',
        'Duration ratio & financial burn-gap feature engineering',
        'Zero black-box outputs: audited against 850 live assets',
      ],
      ctaText: 'View Predictive Analytics',
      ctaHref: '/dashboard/analytics',
      terminalCmd: 'pragati predict PRJ-0042',
    },
    {
      stepNumber: '3',
      badge: 'Step 03 • Explainability & Alerts',
      icon: ShieldAlert,
      accentColor: 'from-indigo-600 to-violet-600',
      badgeColor: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      headline: 'Explain & Alert. SHAP Drivers & Rule Triggers.',
      description:
        'Decomposes predictive scores into clear mathematical factor attributions with Shapley values, while deterministic rules surface immediate early warning flags on abnormal burn gaps.',
      bullets: [
        'Shapley value decomposition for local factor ranking',
        'Surfaces top 3 positive & negative risk contributors',
        'Deterministic early warning triggers on burn gaps',
        'Multi-tier ministerial alert routing & urgency badges',
      ],
      ctaText: 'Review Early Warning Alerts',
      ctaHref: '/dashboard/alerts',
      terminalCmd: 'pragati explain PRJ-0042',
    },
    {
      stepNumber: '4',
      badge: 'Step 04 • Decision Support',
      icon: Bot,
      accentColor: 'from-violet-600 to-fuchsia-600',
      badgeColor: 'border-violet-200 bg-violet-50 text-violet-800',
      headline: 'Decide & Act. Grounded AI & Executive Insights.',
      description:
        'Interactive AI assistant grounded directly in live portfolio telemetry, accompanied by state-wise vector map dossiers, multi-project comparisons, and automated interventions.',
      bullets: [
        'Grounded PRAGATI AI assistant for instant natural Q&A',
        'State-wise interactive choropleth map & ministry dossiers',
        'Side-by-side asset comparison benchmarks & burn charts',
        'Actionable intervention playbooks for project directors',
      ],
      ctaText: 'Launch PRAGATI AI Assistant',
      ctaHref: '/dashboard/assistant',
      terminalCmd: 'pragati ask "Why is PRJ-0042 at risk?"',
    },
  ]

  const demoSteps = [
    {
      title: '1. Ingest PAIMANA & OCMS Project Telemetry',
      badge: 'Data Layer',
      description:
        'Continuous ingestion of monthly project snapshots across 850 infrastructure assets, capturing cumulative expenditure, physical progress, and milestone schedules.',
      link: '/dashboard/projects',
      linkText: 'Explore Monitored Assets',
    },
    {
      title: '2. Dual-Target Predictive Inference',
      badge: 'Machine Learning',
      description:
        'Calibrated ML models evaluate Cost Overrun (Logistic Regression) and Schedule Delay (Random Forest) to forecast probability of future project slippage.',
      link: '/dashboard',
      linkText: 'View Portfolio Risk Matrix',
    },
    {
      title: '3. Local SHAP Drivers & Early Warnings',
      badge: 'Explainability & Alerts',
      description:
        'Decomposes model predictions with Shapley values and deterministic rules to surface early warning flags before critical cost escalations occur.',
      link: '/dashboard/alerts',
      linkText: 'Review Active Warnings',
    },
    {
      title: '4. PRAGATI Intelligence Assistant',
      badge: 'Grounded AI Layer',
      description:
        'Interactive AI assistant grounded directly in application data and ML outputs, enabling natural language queries, project comparisons, and portfolio insights.',
      link: '/dashboard/assistant',
      linkText: 'Ask PRAGATI AI',
    },
  ]

  const featureCards = [
    {
      title: 'Predictive Analytics',
      description: 'Dual-target ML risk forecasting for cost & schedule slippages.',
      icon: TrendingUp,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      href: '/dashboard/analytics',
    },
    {
      title: 'Early Warning System',
      description: 'Pre-critical alert triggers on abnormal burn gaps & milestone slippages.',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      href: '/dashboard/alerts',
    },
    {
      title: 'Risk Scoring',
      description: 'Prioritized ranking & vector map of 850 central capital assets.',
      icon: Target,
      iconBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      href: '/dashboard/projects',
    },
    {
      title: 'Interactive Dashboard',
      description: 'Portfolio-wide telemetry, state choropleth & ministry breakdown.',
      icon: LayoutDashboard,
      iconBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
      href: '/dashboard',
    },
    {
      title: 'PRAGATI AI Assistant',
      description: 'Grounded LLM intelligence, natural language Q&A & project comparisons.',
      icon: Bot,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      href: '/dashboard/assistant',
    },
  ]

  const statsMetrics = [
    {
      value: '850',
      label: 'Monitored Assets',
      icon: Layers,
    },
    {
      value: '17',
      label: 'Central Ministries',
      icon: Building2,
    },
    {
      value: '6',
      label: 'Key Sectors',
      icon: LayoutGrid,
    },
    {
      value: '₹ 37.13 L Cr',
      label: 'Original Outlay',
      icon: Coins,
    },
    {
      value: '₹ 42.78 L Cr',
      label: 'Revised Estimate',
      icon: TrendingUp,
    },
    {
      value: '₹ 20.36 L Cr',
      label: 'Total Expenditure',
      icon: Wallet,
    },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-slate-50/40 to-white border-b border-slate-200/80 pt-8 pb-12 sm:pt-14 sm:pb-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Hero Text & CTAs */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-5">
              {/* Eyebrow Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-blue-900">
                  AI-Powered Infrastructure Monitoring
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Predictive Intelligence for <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900">
                  National Infrastructure
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl font-normal">
                PRAGATI applies dual-target machine learning and local SHAP explainability to central infrastructure telemetry, identifying compounding cost escalations and schedule delays months in advance.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Launch Portfolio Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Explore 850 Projects</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-blue-700 hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4 text-blue-600" />
                  <span>Watch Walkthrough</span>
                </button>
              </div>
            </div>

            {/* Right Column: High-Res Infrastructure Montage with LIVE Vector Overlay Cards */}
            <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[560px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xl bg-slate-900 group aspect-16/10 ring-1 ring-slate-900/10">
                {/* Crisp HD Background Image */}
                <Image
                  src="/images/infrastructure-hero-hd.jpg"
                  alt="Modern Indian Infrastructure: Metro, Hydroelectric Dam, Highway Flyover, Power Grid, and City Skyline"
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />

                {/* Subtle vignette gradients for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-900/40 pointer-events-none" />

                {/* LIVE OVERLAY 1: Top AI Risk Prediction Micro-Card */}
                <Link
                  href="/dashboard/alerts"
                  className="absolute top-3 left-3 max-w-[220px] sm:max-w-[260px] bg-white/95 backdrop-blur-md rounded-xl p-2 sm:p-2.5 border border-slate-200/90 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2.5 group/card cursor-pointer"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-900 group-hover/card:text-blue-700 transition-colors truncate">
                        AI Risk Prediction
                      </span>
                      <span className="text-[8.5px] sm:text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        Alert
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[10.5px] text-slate-500 truncate mt-0.5">
                      12 projects at high overrun risk
                    </p>
                  </div>
                </Link>

                {/* LIVE OVERLAY 2: Bottom Horizontal Risk & Alert Summary Cards */}
                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 sm:gap-3">
                  <Link
                    href="/dashboard/analytics"
                    className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 shadow-lg hover:shadow-xl hover:bg-white transition-all flex items-center gap-2 group/risk cursor-pointer min-w-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200/70 text-rose-700 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] sm:text-[11px] font-medium text-slate-500 truncate leading-tight">
                        Cost Overrun
                      </p>
                      <p className="text-[11px] sm:text-xs font-bold font-mono text-rose-700 leading-tight mt-0.5 truncate">
                        74% <span className="font-sans text-[9.5px] text-slate-400 font-normal hidden md:inline">Risk</span>
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/analytics"
                    className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 shadow-lg hover:shadow-xl hover:bg-white transition-all flex items-center gap-2 group/risk cursor-pointer min-w-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] sm:text-[11px] font-medium text-slate-500 truncate leading-tight">
                        Schedule Delay
                      </p>
                      <p className="text-[11px] sm:text-xs font-bold font-mono text-amber-700 leading-tight mt-0.5 truncate">
                        68% <span className="font-sans text-[9.5px] text-slate-400 font-normal hidden md:inline">Risk</span>
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/alerts"
                    className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2 shadow-lg hover:shadow-xl hover:bg-white transition-all flex items-center gap-2 group/risk cursor-pointer min-w-0"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200/70 text-purple-700 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] sm:text-[11px] font-medium text-slate-500 truncate leading-tight">
                        Early Warnings
                      </p>
                      <p className="text-[11px] sm:text-xs font-bold font-mono text-purple-700 leading-tight mt-0.5 truncate">
                        28 <span className="font-sans text-[9.5px] text-slate-400 font-normal hidden md:inline">Active</span>
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION — LIGHT THEME & HORIZONTAL WORKFLOW */}
      <section className="py-12 sm:py-16 bg-slate-50/80 border-b border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-xs font-mono font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>HOW IT WORKS &bull; END-TO-END PIPELINE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                From Raw Telemetry to Executive Action
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                A horizontal 4-stage pipeline combining automated ingestion, calibrated ML inference, local SHAP attribution, and grounded decision support.
              </p>
            </div>

            {/* Step Selection Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0">
              {workflowSteps.map((step, idx) => (
                <button
                  key={step.stepNumber}
                  type="button"
                  onClick={() => {
                    setSelectedWorkflowStep(idx)
                    executeCommand(step.terminalCmd)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedWorkflowStep === idx
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-mono text-[11px]">0{step.stepNumber}</span>
                  <span className="hidden sm:inline">{step.badge.split('•')[1]?.trim()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* HORIZONTAL WORKFLOW CARDS GRID (CLEAN LIGHT THEME, NO OVERLAY BG LINE) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {workflowSteps.map((step, idx) => {
              const IconComponent = step.icon
              const isSelected = selectedWorkflowStep === idx

              return (
                <div
                  key={step.stepNumber}
                  onClick={() => {
                    setSelectedWorkflowStep(idx)
                    executeCommand(step.terminalCmd)
                  }}
                  className={`flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-300 border cursor-pointer group ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20 -translate-y-1'
                      : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Step Ring Node & Icon Indicator */}
                    <div className="flex items-center justify-between mb-4">
                      {/* Step Number Badge */}
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-extrabold text-base transition-all ${
                            isSelected
                              ? 'bg-blue-700 text-white shadow-md ring-4 ring-blue-100'
                              : 'bg-slate-900 text-white ring-4 ring-slate-100 group-hover:bg-slate-800'
                          }`}
                        >
                          {step.stepNumber}
                        </div>
                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                        )}
                      </div>

                      {/* Icon Container */}
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${step.accentColor} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Pill Category Badge */}
                    <div className="mb-2.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md border text-[10.5px] font-mono uppercase tracking-wider font-semibold ${step.badgeColor}`}
                      >
                        {step.badge}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                      {step.headline}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {step.description}
                    </p>

                    {/* Bullet List with Green Checkmarks */}
                    <ul className="space-y-2 mb-5 border-t border-slate-100 pt-3">
                      {step.bullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-snug"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={step.ctaHref}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors group/btn cursor-pointer"
                    >
                      <span>{step.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* INTERACTIVE PRAGATI CLI TERMINAL */}
          <div className="mt-8 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg overflow-hidden flex flex-col backdrop-blur-xs">
            {/* Terminal Window Header */}
            <div className="px-4 py-2.5 bg-slate-800/85 border-b border-slate-700/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 inline-block shadow-2xs" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 inline-block shadow-2xs" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 inline-block shadow-2xs" />
                </div>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono text-slate-300 font-semibold tracking-wide">
                    pragati-cli &bull; Infrastructure Telemetry Console
                  </span>
                </div>
              </div>

              {/* Minimalist Essential Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => executeCommand('pragati --help')}
                  className="px-2.5 py-1 rounded-md bg-slate-700/70 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-600/70 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>--help</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('clear')}
                  title="Clear Console"
                  className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-600/60 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">clear</span>
                </button>
              </div>
            </div>

            {/* Terminal Output Stream with Internal Scrolling */}
            <div
              ref={terminalContainerRef}
              className="p-4 font-mono text-xs max-h-[260px] overflow-y-auto space-y-2.5 bg-slate-950/70 text-slate-200 scrollbar-thin scrollbar-thumb-slate-700"
            >
              {terminalLogs.length === 0 ? (
                <div className="text-slate-500 italic py-2">
                  Console cleared. Type <span className="text-cyan-400 font-semibold">pragati --help</span> or click <span className="text-slate-300 font-semibold">[--help]</span> to display commands.
                </div>
              ) : (
                terminalLogs.map((log, idx) => (
                  <div key={idx} className="space-y-1">
                    {/* Prompt Line */}
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-emerald-400 font-bold">admin@pragati</span>
                      <span className="text-slate-600">:</span>
                      <span className="text-blue-400">~</span>
                      <span className="text-slate-500">$</span>
                      <span className="text-slate-100 font-semibold">{log.command}</span>
                      <span className="text-[10px] text-slate-500 ml-auto font-mono">{log.timestamp}</span>
                    </div>

                    {/* Output Block */}
                    <div
                      className={`pl-3 border-l-2 py-0.5 whitespace-pre-wrap leading-relaxed ${
                        log.type === 'error'
                          ? 'border-rose-500/80 text-rose-300'
                          : log.type === 'warning'
                          ? 'border-amber-500/80 text-amber-200'
                          : log.type === 'success'
                          ? 'border-emerald-500/80 text-emerald-300'
                          : 'border-cyan-500/80 text-slate-300'
                      }`}
                    >
                      {log.output}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Interactive Command Input Box */}
            <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-xs font-bold shrink-0 pl-1">
                pragati &gt;
              </span>
              <input
                ref={terminalInputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command (e.g. pragati --help, pragati predict PRJ-0042, clear)..."
                className="flex-1 bg-transparent text-white placeholder-slate-500 font-mono text-xs focus:outline-none border-none"
              />
              <button
                type="button"
                onClick={() => executeCommand(terminalInput)}
                disabled={!terminalInput.trim()}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Run</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY PLATFORM FEATURES & PORTFOLIO STATS SECTIONS */}
      <section className="py-8 sm:py-10 bg-slate-50/80 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Section 3A: Key Platform Features Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5 p-4 sm:p-5">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Key Platform Features
                  </h2>
                  <span className="h-1 w-6 bg-blue-600 rounded-full" aria-hidden="true" />
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Predictive decision support &mdash; powered by dual-target ML and grounded intelligence
                </p>
              </div>

              <Link
                href="/dashboard"
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 hidden sm:inline-flex items-center gap-1"
              >
                <span>Full Portfolio Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 5 Compact Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {featureCards.map((feat) => {
                const Icon = feat.icon
                return (
                  <Link
                    key={feat.title}
                    href={feat.href}
                    className="h-[120px] sm:h-[124px] p-3 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-xs hover:ring-1 hover:ring-blue-400/20 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg ${feat.iconBg} border flex items-center justify-center group-hover:scale-105 transition-transform`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {feat.title}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {feat.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Section 3B: Portfolio Statistics */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Portfolio Scale &amp; Capital Outlay
                </h3>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">&bull; 850 Assets &bull; 6 Key Sectors</span>
              </div>
              <Link href="/dashboard/projects" className="text-[11px] font-semibold text-blue-700 hover:underline">
                View All Assets &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {statsMetrics.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 tracking-tight whitespace-nowrap">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 whitespace-nowrap leading-tight mt-0.5 truncate">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SYSTEM ARCHITECTURE & INSTITUTIONAL CAPABILITIES */}
      <section className="py-10 sm:py-14 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-1">
              System Architecture
            </h2>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Institutional Decision Support Engine
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Proactive machine learning and local explainability built around MoSPI PAIMANA and OCMS monitoring standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                Dual-Target Predictive ML
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Separate binary classification models for Cost Overrun (Logistic Regression)
                and Schedule Delay (Random Forest) producing calibrated 0.00 – 1.00 risk probabilities.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Target Outcome Quarantine Enforced</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                SHAP Local Explainability
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Model predictions are decomposed using Shapley values, surfacing top risk drivers
                with observed project telemetry and clear directional indicators.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Model-Supported Factor Rankings</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                Early Warning Decision Rules
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Deterministic rules evaluate financial-physical burn gaps, milestone slippage ratios,
                and duration elapsed to surface prioritized warning candidates.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                <Clock className="w-3.5 h-3.5" />
                <span>Continuous Trajectory Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DIRECT PORTAL NAVIGATION BANNER */}
      <section className="bg-slate-50 py-8 sm:py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                Interactive Decision Support
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Access Central Infrastructure Portfolio
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Explore 850 monitored projects across Petroleum, Power, Railways, Roads, Shipping, and Urban Development with real-time ML risk scoring.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-white text-blue-950 font-bold text-xs hover:bg-slate-100 transition-all shadow-xs"
              >
                Open Dashboard
              </Link>
              <Link
                href="/dashboard/projects"
                className="px-4 py-2 rounded-lg bg-blue-800 text-white font-bold text-xs hover:bg-blue-700 transition-all border border-blue-700 shadow-xs"
              >
                Browse Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE "WATCH WALKTHROUGH" MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">PRAGATI Platform Guided Tour</h3>
                  <p className="text-[11px] text-slate-400">
                    Dual-Target ML &bull; Early Warnings &bull; Grounded Intelligence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close demo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Content */}
            <div className="p-6 space-y-5">
              {/* Step indicator tabs */}
              <div className="grid grid-cols-4 gap-2 border-b border-slate-100 pb-3">
                {demoSteps.map((s, idx) => (
                  <button
                    key={s.badge}
                    type="button"
                    onClick={() => setActiveDemoStep(idx)}
                    className={`text-left p-2 rounded-lg transition-all cursor-pointer ${
                      activeDemoStep === idx
                        ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-blue-600">Step {idx + 1}</div>
                    <div className="text-xs truncate">{s.badge}</div>
                  </button>
                ))}
              </div>

              {/* Active Step Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {demoSteps[activeDemoStep].badge}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Step {activeDemoStep + 1} of {demoSteps.length}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {demoSteps[activeDemoStep].title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {demoSteps[activeDemoStep].description}
                </p>

                <div className="pt-2">
                  <Link
                    href={demoSteps[activeDemoStep].link}
                    onClick={() => setShowDemoModal(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>{demoSteps[activeDemoStep].linkText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Step Navigation footer */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={activeDemoStep === 0}
                  onClick={() => setActiveDemoStep((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  &larr; Previous
                </button>
                <div className="flex items-center gap-1.5">
                  {demoSteps.map((_, idx) => (
                    <span
                      key={`dot-${idx}`}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        activeDemoStep === idx ? 'bg-blue-600 w-4' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
                {activeDemoStep < demoSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveDemoStep((prev) => Math.min(demoSteps.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDemoModal(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
