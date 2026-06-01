export default function Modal({ title, children, onClose, footer, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative bg-white w-full sm:rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-in ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-md'
        } rounded-t-2xl sm:rounded-b-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
