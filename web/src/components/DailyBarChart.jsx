const FILL = {
  'bg-teal-600': '#0d9488',
  'bg-amber-500': '#f59e0b',
  'bg-violet-500': '#8b5cf6',
  'bg-rose-500': '#f43f5e',
}

function formatChartLabel(label) {
  if (!label) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(label))
  if (!m) return label
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function monthTitle() {
  return new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function DailyBarChart({
  title,
  subtitle,
  points,
  color = 'bg-amber-500',
  icon: Icon,
  yAxisLabel = 'Check-ins',
}) {
  const fill = FILL[color] || '#f59e0b'

  if (!points?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
          {Icon && <Icon className="text-brand shrink-0" />}
          {title}
        </h3>
        <p className="text-sm text-slate-500">No check-ins this month yet.</p>
      </div>
    )
  }

  const vals = points.map((p) => Number(p.value ?? 0))
  const max = Math.max(1, ...vals)
  const total = vals.reduce((a, b) => a + b, 0)
  const yTicks = [0, Math.ceil(max / 2), max]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            {Icon && <Icon className="text-brand shrink-0" />}
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle || monthTitle()}</p>
        </div>
        <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">{total} total</p>
      </div>

      <p className="text-[10px] text-slate-400 mb-2">{yAxisLabel} (vertical) · Date (horizontal)</p>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between h-36 py-0.5 shrink-0 w-8 text-right">
          {[...yTicks].reverse().map((t) => (
            <span key={t} className="text-[9px] text-slate-400 tabular-nums leading-none">
              {t}
            </span>
          ))}
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-end gap-0.5 h-36 min-w-max px-0.5 border-l border-b border-slate-200">
            {points.map((p) => {
              const v = Number(p.value ?? 0)
              const h = max > 0 ? (v / max) * 100 : 0
              return (
                <div
                  key={p.label}
                  className="flex flex-col items-center justify-end gap-1 w-7 sm:w-8 shrink-0"
                  title={`${formatChartLabel(p.label)}: ${v} check-in${v === 1 ? '' : 's'}`}
                >
                  <span className="text-[9px] text-slate-600 tabular-nums font-medium min-h-[12px]">
                    {v > 0 ? v : ''}
                  </span>
                  <div
                    className="w-full rounded-t min-h-[2px] transition-all"
                    style={{ height: `${Math.max(h, v > 0 ? 4 : 0)}%`, backgroundColor: fill }}
                  />
                  <span className="text-[8px] text-slate-500 truncate w-full text-center leading-tight -rotate-0">
                    {formatChartLabel(p.label)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
