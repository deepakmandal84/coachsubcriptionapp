export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-0.5 flex-wrap" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
            active === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.icon && <t.icon className="text-base" />}
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}
