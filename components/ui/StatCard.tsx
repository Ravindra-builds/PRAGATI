import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
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
  badge,
  className = '',
}: StatCardProps) {
  const badgeVariants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </span>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeVariants[badge.variant || 'neutral']}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  )
}
