const STROKE = {
  'bg-teal-600': '#0d9488',
  'bg-amber-500': '#f59e0b',
  'bg-violet-500': '#8b5cf6',
  'bg-rose-500': '#f43f5e',
  'bg-sky-600': '#0284c7',
}

function formatChartLabel(label) {
  if (!label) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(label))
  if (!m) return label.length > 6 ? label.slice(5) : label
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatValue(v, decimals = 1) {
  if (v == null || Number.isNaN(v)) return '—'
  const n = Number(v)
  return Number.isInteger(n) && decimals === 0 ? String(n) : n.toFixed(decimals)
}

function chartGeometry(points, width, height, pad) {
  const vals = points.map((p) => Number(p.value ?? 0))
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) {
    min -= min === 0 ? 1 : min * 0.1
    max += max === 0 ? 1 : max * 0.1
  } else {
    const span = max - min
    min -= span * 0.08
    max += span * 0.08
  }

  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const n = points.length

  const coords = points.map((p, i) => {
    const x = n === 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW
    const v = Number(p.value ?? 0)
    const y = pad.top + innerH - ((v - min) / (max - min)) * innerH
    return { x, y, label: p.label, value: v }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')

  return { coords, linePath, min, max }
}

export default function ProgressLineChart({
  title,
  points,
  color = 'bg-teal-600',
  icon: Icon,
  valueSuffix = '',
  decimals = 1,
}) {
  const stroke = STROKE[color] || '#0d9488'

  if (!points?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
          {Icon && <Icon className="text-brand shrink-0" />}
          {title}
        </h3>
        <p className="text-sm text-slate-500">No data yet — log a check-in to see progress.</p>
      </div>
    )
  }

  const width = 320
  const height = 140
  const pad = { top: 12, right: 12, bottom: 28, left: 36 }
  const { coords, linePath, min, max } = chartGeometry(points, width, height, pad)
  const latest = coords[coords.length - 1]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2 min-w-0">
          {Icon && <Icon className="text-brand shrink-0" />}
          <span className="truncate">{title}</span>
        </h3>
        <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
          {formatValue(latest.value, decimals)}
          {valueSuffix}
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[280px] h-auto"
          role="img"
          aria-label={`${title} line chart`}
        >
          {/* Y-axis guide lines */}
          {[0, 0.5, 1].map((t) => {
            const y = pad.top + (height - pad.top - pad.bottom) * t
            const val = max - t * (max - min)
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={pad.left - 4} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                  {formatValue(val, decimals)}
                </text>
              </g>
            )
          })}

          {/* Line */}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {coords.map((c, i) => (
            <g key={`${c.label}-${i}`}>
              <circle cx={c.x} cy={c.y} r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
              <title>
                {formatChartLabel(c.label)}: {formatValue(c.value, decimals)}
                {valueSuffix}
              </title>
            </g>
          ))}

          {/* X-axis labels (show first, middle, last when many points) */}
          {coords.map((c, i) => {
            const show =
              coords.length <= 4 || i === 0 || i === coords.length - 1 || i === Math.floor(coords.length / 2)
            if (!show) return null
            return (
              <text
                key={`lbl-${c.label}-${i}`}
                x={c.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[9px]"
              >
                {formatChartLabel(c.label)}
              </text>
            )
          })}
        </svg>
      </div>

      <p className="text-[10px] text-slate-400 mt-1">{points.length} check-in{points.length === 1 ? '' : 's'}</p>
    </div>
  )
}
