import React from 'react'

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface RiskBadgeProps {
  level: RiskTier | string
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

export function RiskBadge({
  level,
  size = 'md',
  showDot = true,
  className = '',
}: RiskBadgeProps) {
  const normalized = (level || 'LOW').toUpperCase() as RiskTier

  const styles: Record<
    RiskTier,
    { badge: string; dot: string; label: string }
  > = {
    LOW: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Low Risk',
    },
    MEDIUM: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Medium Risk',
    },
    HIGH: {
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      dot: 'bg-orange-500',
      label: 'High Risk',
    },
    CRITICAL: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200 font-medium',
      dot: 'bg-rose-600',
      label: 'Critical Risk',
    },
  }

  const current = styles[normalized] || styles.LOW

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size]

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${current.badge} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Risk level: ${current.label}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${current.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{current.label}</span>
    </span>
  )
}
