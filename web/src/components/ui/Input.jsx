export default function Input({ label, id, className = '', ...props }) {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="w-full min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-slate-400 focus-brand focus:outline-none"
        {...props}
      />
    </div>
  )
}
