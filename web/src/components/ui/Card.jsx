export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${padding ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}
