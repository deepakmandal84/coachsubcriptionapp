const variants = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-brand-subtle border-brand-subtle text-slate-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
}

export default function Alert({ variant = 'info', children, onDismiss }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${variants[variant]}`} role="alert">
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-current opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  )
}
