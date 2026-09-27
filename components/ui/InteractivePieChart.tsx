'use client'

import React from 'react'

export interface PieSliceItem {
  key: string
  label: string
  count: number
  pct: number
  color: string
  darkColor: string
  description?: string
}

interface InteractivePieChartProps {
  slices: PieSliceItem[]
  total: number
  hoveredKey: string | null
  selectedKey?: string
  onHoverKey: (key: string | null) => void
  onSelectKey?: (key: string) => void
}

export function InteractivePieChart({
  slices,
  total,
  hoveredKey,
  selectedKey,
  onHoverKey,
  onSelectKey,
}: InteractivePieChartProps) {
  const cx = 115
  const cy = 88
  const rx = 88
  const ry = 68
  const depth = 15

  // Filter positive slices and compute angles purely (without mutating outer variables inside map)
  const validSlices = slices.filter((s) => s.pct > 0)
  const totalPct = validSlices.reduce((acc, s) => acc + s.pct, 0) || 100

  const computed = validSlices.map((s, idx) => {
    const priorPct = validSlices.slice(0, idx).reduce((acc, item) => acc + item.pct, 0)
    const startAngle = -Math.PI / 2 + (priorPct / totalPct) * Math.PI * 2
    const sweep = (s.pct / totalPct) * Math.PI * 2
    const endAngle = startAngle + sweep
    const midAngle = startAngle + sweep / 2

    const isFullCircle = sweep >= Math.PI * 2 - 0.001
    const largeArc = sweep > Math.PI ? 1 : 0

    const x1 = cx + rx * Math.cos(startAngle)
    const y1 = cy + ry * Math.sin(startAngle)
    const x2 = cx + rx * Math.cos(endAngle)
    const y2 = cy + ry * Math.sin(endAngle)

    // Top wedge path
    const topPath = isFullCircle
      ? `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
      : `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rx} ${ry} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`

    // Shifted bottom wedge + outer rim for 3D cylinder extrusion
    const bottomPath = isFullCircle
      ? `M ${cx - rx} ${cy + depth} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy + depth} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy + depth} Z`
      : `M ${cx} ${cy + depth} L ${x1.toFixed(2)} ${(y1 + depth).toFixed(2)} A ${rx} ${ry} 0 ${largeArc} 1 ${x2.toFixed(2)} ${(y2 + depth).toFixed(2)} Z`

    const rimPath = isFullCircle
      ? `M ${cx - rx} ${cy} L ${cx - rx} ${cy + depth} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy + depth} L ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`
      : `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x1.toFixed(2)} ${(y1 + depth).toFixed(2)} A ${rx} ${ry} 0 ${largeArc} 1 ${x2.toFixed(2)} ${(y2 + depth).toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${rx} ${ry} 0 ${largeArc} 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`

    // Cut-face side walls (visible when slice pops out)
    const sideWall1 = `M ${cx} ${cy} L ${cx} ${cy + depth} L ${x1.toFixed(2)} ${(y1 + depth).toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    const sideWall2 = `M ${cx} ${cy} L ${cx} ${cy + depth} L ${x2.toFixed(2)} ${(y2 + depth).toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} Z`

    // Label position inside the wedge
    const labelRadiusFactor = s.pct < 10 ? 0.68 : 0.56
    const lx = cx + rx * labelRadiusFactor * Math.cos(midAngle)
    const ly = cy + ry * labelRadiusFactor * Math.sin(midAngle)

    // Pop-out translation when hovered or selected
    const isActive = hoveredKey === s.key || Boolean(selectedKey && selectedKey === s.key)
    const popDist = isActive ? 7.5 : 0
    const dx = Math.cos(midAngle) * popDist
    const dy = Math.sin(midAngle) * popDist

    return {
      ...s,
      topPath,
      bottomPath,
      rimPath,
      sideWall1,
      sideWall2,
      lx,
      ly,
      isActive,
      dx,
      dy,
    }
  })

  const activeSlice =
    computed.find((s) => s.key === hoveredKey) ||
    computed.find((s) => s.key === selectedKey) ||
    null

  return (
    <div className="relative w-56 sm:w-60 shrink-0 flex flex-col items-center select-none">
      <svg
        viewBox="0 0 230 190"
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="3D portfolio risk distribution pie chart"
      >
        <defs>
          <filter id="pieDropShadow" x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* Layer 1: 3D Extruded Base & Side Rims */}
        <g filter="url(#pieDropShadow)">
          {computed.map((s) => (
            <g
              key={`base-${s.key}`}
              style={{
                transform: `translate(${s.dx.toFixed(2)}px, ${s.dy.toFixed(2)}px)`,
                transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              className="cursor-pointer"
              onMouseEnter={() => onHoverKey(s.key)}
              onMouseLeave={() => onHoverKey(null)}
              onClick={() => onSelectKey?.(s.key)}
            >
              <path d={s.bottomPath} fill={s.darkColor} />
              <path d={s.sideWall1} fill={s.darkColor} />
              <path d={s.sideWall2} fill={s.darkColor} />
              <path d={s.rimPath} fill={s.darkColor} />
            </g>
          ))}
        </g>

        {/* Layer 2: Crisp Top Wedge Faces */}
        {computed.map((s) => {
          const isDimmed = hoveredKey !== null && hoveredKey !== s.key
          return (
            <g
              key={`top-${s.key}`}
              style={{
                transform: `translate(${s.dx.toFixed(2)}px, ${s.dy.toFixed(2)}px)`,
                transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease',
                opacity: isDimmed ? 0.82 : 1,
              }}
              className="cursor-pointer"
              onMouseEnter={() => onHoverKey(s.key)}
              onMouseLeave={() => onHoverKey(null)}
              onClick={() => onSelectKey?.(s.key)}
            >
              <path
                d={s.topPath}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth={s.isActive ? '2' : '1.2'}
                strokeLinejoin="round"
              />

              {/* Bold percentage label directly inside each slice */}
              {s.pct >= 4.5 && (
                <text
                  x={s.lx}
                  y={s.ly + 4}
                  textAnchor="middle"
                  className="pointer-events-none font-mono font-extrabold fill-white"
                  style={{
                    fontSize: s.pct < 10 ? '11px' : '13px',
                    filter: 'drop-shadow(0px 1px 2px rgba(15, 23, 42, 0.45))',
                  }}
                >
                  {Math.round(s.pct)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Instant Zero-Delay Hover Status Pill Below Pie */}
      <div className="w-full min-h-11 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs flex items-center justify-between gap-2 shadow-xs border border-slate-800 transition-all duration-100">
        {activeSlice ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeSlice.color }}
              />
              <span className="font-bold truncate">{activeSlice.label}</span>
            </div>
            <div className="font-mono text-[11px] shrink-0 flex items-center gap-1.5">
              <span className="font-extrabold text-white">{activeSlice.count}</span>
              <span className="text-slate-400">({activeSlice.pct.toFixed(1)}%)</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-300 font-medium">
              Hover slice for details
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-200">
              {total} total
            </span>
          </>
        )}
      </div>
    </div>
  )
}
