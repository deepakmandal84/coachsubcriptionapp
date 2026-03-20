import { useMemo, useState } from 'react'
import { FaShareAlt, FaWhatsapp, FaEnvelope, FaInstagram, FaRegCopy } from 'react-icons/fa'

function safeEncode(value) {
  return encodeURIComponent(value ?? '')
}

export default function LinkShare({
  url,
  title = 'Share',
  text = 'Check this out',
  className = '',
  variant = 'full', // 'full' => labels, 'compact' => icon-only buttons
}) {
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => {
    if (!url) return ''
    return String(url)
  }, [url])

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      return
    } catch {
      // iOS Safari can block clipboard in some cases. Fallback to a textarea selection.
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  async function shareNative() {
    if (!shareUrl) return
    if (!navigator.share) {
      // If native share isn't available, copy to clipboard.
      await copyLink()
      return
    }
    await navigator.share({ title, text, url: shareUrl })
  }

  function shareWhatsApp() {
    if (!shareUrl) return
    const msg = `${text} ${shareUrl}`.trim()
    window.open(`https://wa.me/?text=${safeEncode(msg)}`, '_blank', 'noopener,noreferrer')
  }

  function shareEmail() {
    if (!shareUrl) return
    const subject = title
    const body = `${text}\n\n${shareUrl}`
    window.location.href = `mailto:?subject=${safeEncode(subject)}&body=${safeEncode(body)}`
  }

  function shareInstagram() {
    // Instagram web does not reliably support deep-linking a URL from browsers.
    // Best-effort: copy link and let the user paste into Instagram.
    copyLink()
    alert('Link copied. Paste it in your Instagram story/post.')
  }

  if (!shareUrl) return null

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <button
        type="button"
        onClick={shareNative}
        className={variant === 'compact' ? 'p-2 rounded border bg-white hover:bg-gray-50 inline-flex items-center justify-center' : 'px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 inline-flex items-center gap-2'}
        aria-label="Share"
      >
        <FaShareAlt className="text-base text-sky-600" />
        {variant === 'full' && 'Share'}
      </button>
      <button
        type="button"
        onClick={shareWhatsApp}
        className={variant === 'compact' ? 'p-2 rounded border bg-white hover:bg-gray-50 inline-flex items-center justify-center' : 'px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 inline-flex items-center gap-2'}
        aria-label="Share on WhatsApp"
      >
        <FaWhatsapp className="text-base" style={{ color: '#25D366' }} />
        {variant === 'full' && 'WhatsApp'}
      </button>
      <button
        type="button"
        onClick={shareEmail}
        className={variant === 'compact' ? 'p-2 rounded border bg-white hover:bg-gray-50 inline-flex items-center justify-center' : 'px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 inline-flex items-center gap-2'}
        aria-label="Share by Email"
      >
        <FaEnvelope className="text-base text-blue-600" />
        {variant === 'full' && 'Email'}
      </button>
      <button
        type="button"
        onClick={shareInstagram}
        className={variant === 'compact' ? 'p-2 rounded border bg-white hover:bg-gray-50 inline-flex items-center justify-center' : 'px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 inline-flex items-center gap-2'}
        aria-label="Share on Instagram"
      >
        <span
          className="inline-flex items-center justify-center rounded"
          style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}
        >
          <FaInstagram className="text-base text-white" />
        </span>
        {variant === 'full' && 'Instagram'}
      </button>
      <button
        type="button"
        onClick={copyLink}
        className={variant === 'compact' ? 'p-2 rounded border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 inline-flex items-center justify-center' : 'px-3 py-2 text-sm rounded border bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-2'}
        aria-label="Copy link"
      >
        <FaRegCopy className="text-base" />
        {variant === 'full' && (copied ? 'Copied' : 'Copy link')}
      </button>
    </div>
  )
}

