const styles = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  warning: 'bg-amber-50 text-amber-800 border-amber-100',
  danger: 'bg-red-50 text-red-800 border-red-100',
  info: 'bg-brand-subtle text-brand border-brand-subtle',
}

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
