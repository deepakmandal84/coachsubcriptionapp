function maxOf(points) {
  return Math.max(1, ...(points || []).map((p) => p.value ?? 0))
}

function formatChartLabel(label) {
  if (!label) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(label))
  if (!m) return label.length > 6 ? label.slice(5) : label
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ProgressLineChart({ title, points, color = 'bg-teal-600', icon: Icon }) {
  if (!points?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-medium text-slate-900 mb-2 flex items-center gap-2">
          {Icon && <Icon className="text-brand" />}
          {title}
        </h3>
        <p className="text-sm text-slate-500">No data yet — log a check-in to see progress.</p>
      </div>
    )
  }

  const max = maxOf(points)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
        {Icon && <Icon className="text-brand" />}
        {title}
      </h3>
      <div className="flex items-end gap-1 h-32">
        {points.map((p) => (
          <div key={p.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className={`w-full ${color} rounded-t min-h-[4px]`}
              style={{ height: `${((p.value ?? 0) / max) * 100}%` }}
              title={`${p.label}: ${p.value}`}
            />
            <span className="text-[10px] text-slate-500 truncate w-full text-center">{formatChartLabel(p.label)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
