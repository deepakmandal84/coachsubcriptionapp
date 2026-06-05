export default function SessionClientsMultiSelect({
  label,
  hint,
  students,
  selectedIds,
  onChange,
  excludeIds = [],
}) {
  const exclude = new Set((excludeIds || []).map(String))
  const selected = new Set((selectedIds || []).map(String))
  const options = (students || []).filter((s) => !exclude.has(String(s.id)))

  function toggle(id) {
    const sid = String(id)
    const next = new Set(selected)
    if (next.has(sid)) next.delete(sid)
    else next.add(sid)
    onChange([...next])
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-slate-500">{hint || 'No clients available to add.'}</p>
    )
  }

  return (
    <div>
      {label && <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>}
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <div className="border border-slate-200 rounded-lg divide-y max-h-40 overflow-y-auto">
        {options.map((s) => {
          const checked = selected.has(String(s.id))
          return (
            <label
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm"
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
              <span className="font-medium">{s.name}</span>
            </label>
          )
        })}
      </div>
      {selected.size > 0 && (
        <p className="text-xs text-slate-500 mt-1.5">
          {selected.size} client{selected.size === 1 ? '' : 's'} selected
        </p>
      )}
    </div>
  )
}
