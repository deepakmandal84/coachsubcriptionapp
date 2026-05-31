import { createContext, useCallback, useContext, useState } from 'react'
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message, variant = 'success', duration = 4000) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, variant }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, success: (m) => toast(m, 'success'), error: (m) => toast(m, 'error') }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm ${
              t.variant === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {t.variant === 'error' ? (
              <FiAlertCircle className="shrink-0 text-red-600 mt-0.5" />
            ) : (
              <FiCheckCircle className="shrink-0 text-emerald-600 mt-0.5" />
            )}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast requires ToastProvider')
  return ctx
}
