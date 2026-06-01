import { useEffect, useRef, useState } from 'react'
import { FiCopy, FiShare2 } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { subscriptionsApi } from '../../api'
import { useToast } from '../../context/ToastContext'
import { formatError } from '../../utils/formatError'

const shareBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand hover:border-brand/30'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    try {
      document.execCommand('copy')
      return true
    } finally {
      document.body.removeChild(ta)
    }
  }
}

function digitsOnlyPhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

function buildWhatsAppUrl(phone, message) {
  const text = encodeURIComponent(message)
  const digits = digitsOnlyPhone(phone)
  if (digits) return `https://wa.me/${digits}?text=${text}`
  return `https://wa.me/?text=${text}`
}

function progressLinkMessage(studentName, url) {
  const name = studentName?.trim()
  if (name) {
    return `Hi ${name}, please use this link to log your weight and measurements:\n\n${url}`
  }
  return `Please use this link to log your weight and measurements:\n\n${url}`
}

/** Share menu: copy or WhatsApp a client progress link (?tab=progress). */
export default function CopyWeightLogLink({ studentId, studentName, studentPhone }) {
  const toast = useToast()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  async function fetchProgressUrl() {
    const res = await subscriptionsApi.getParentLink(studentId, null, 90)
    const base = String(res.url || '').trim()
    if (!base) throw new Error('Could not create link')
    return base.includes('?') ? `${base}&tab=progress` : `${base}?tab=progress`
  }

  async function handleCopy() {
    if (busy) return
    setBusy('copy')
    try {
      const url = await fetchProgressUrl()
      await copyToClipboard(url)
      toast.success('Link copied')
      setOpen(false)
    } catch (ex) {
      toast.error(formatError(ex))
    } finally {
      setBusy(null)
    }
  }

  async function handleWhatsApp() {
    if (busy) return
    setBusy('whatsapp')
    try {
      const url = await fetchProgressUrl()
      const message = progressLinkMessage(studentName, url)
      window.open(buildWhatsAppUrl(studentPhone, message), '_blank', 'noopener,noreferrer')
      setOpen(false)
    } catch (ex) {
      toast.error(formatError(ex))
    } finally {
      setBusy(null)
    }
  }

  const menuVisible = open

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={shareBtn}
        disabled={!!busy}
        aria-label="Share weight log link"
        aria-expanded={menuVisible}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        title="Share link to log weight"
      >
        {busy ? (
          <span className="text-xs animate-pulse" aria-hidden>
            …
          </span>
        ) : (
          <FiShare2 className="text-base" aria-hidden />
        )}
      </button>

      <div
        className={`absolute right-0 top-full z-30 pt-1 min-w-[10.5rem] transition-opacity ${
          menuVisible ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        }`}
      >
        <div role="menu" className="rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <button
          type="button"
          role="menuitem"
          disabled={!!busy}
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FiCopy className="shrink-0 text-slate-500" aria-hidden />
          Copy link
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={!!busy}
          onClick={(e) => {
            e.stopPropagation()
            handleWhatsApp()
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FaWhatsapp className="shrink-0" style={{ color: '#25D366' }} aria-hidden />
          WhatsApp
        </button>
        </div>
      </div>
    </div>
  )
}
