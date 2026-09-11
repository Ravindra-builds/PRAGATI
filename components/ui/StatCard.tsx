import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  accent?: 'neutral' | 'danger' | 'warning' | 'amber' | 'success'
  badge?: {
    text: string
    variant?: 'neutral' | 'info' | 'warning' | 'danger' | 'success'
  }
  className?: string
}

export function StatCard({
  title,
  value,
  subtext,
  icon,
  accent = 'neutral',
  badge,
  className = '',
}: StatCardProps) {
  const badgeVariants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-orange-50 text-orange-700 border-orange-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const accentBorders = {
    neutral: 'border-slate-200 hover:border-slate-300',
    danger: 'border-rose-200 hover:border-rose-300',
    warning: 'border-orange-200 hover:border-orange-300',
    amber: 'border-amber-200 hover:border-amber-300',
    success: 'border-emerald-200 hover:border-emerald-300',
  }

  const iconContainers = {
    neutral: 'bg-slate-50 text-slate-600',
    danger: 'bg-rose-50 text-rose-600',
    warning: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div
      className={`bg-white rounded-xl border p-4 sm:p-5 shadow-xs transition-colors flex flex-col justify-between ${accentBorders[accent]} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {icon && (
          <div className={`p-1.5 rounded-md ${iconContainers[accent]}`}>
            {icon}
          </div>
        )}
        {badge && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeVariants[badge.variant || 'neutral']}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div>
        {/* Primary Number */}
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </div>

        {/* Metric Name */}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
          {title}
        </div>

        {/* Short Context */}
        {subtext && (
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}
