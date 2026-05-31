import { useEffect, useRef, useState } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import Button from './ui/Button'

export default function RowActionsMenu({ items, label = 'Actions' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const visible = items.filter((i) => !i.hidden)

  return (
    <div className="relative inline-block" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-slate-500"
      >
        <FiMoreVertical />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[11rem] py-1 bg-white rounded-lg border border-slate-200 shadow-lg">
          {visible.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick?.()
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-40 ${
                item.danger ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {item.icon && <item.icon className="shrink-0" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
