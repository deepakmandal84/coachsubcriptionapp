export default function Select({ label, id, className = '', children, ...props }) {
  const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined)
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus-brand focus:outline-none"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
