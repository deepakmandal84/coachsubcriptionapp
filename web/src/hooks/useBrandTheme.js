import { useEffect } from 'react'
import {
  DEFAULT_PRIMARY,
  DEFAULT_PRIMARY_HOVER_RGB,
  DEFAULT_PRIMARY_RGB,
  darkenRgb,
  resolvePrimaryColor,
} from '../constants/theme'

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return null
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function useBrandTheme(primaryColor) {
  useEffect(() => {
    const hex = resolvePrimaryColor(primaryColor)
    const rgb = hexToRgb(hex) || DEFAULT_PRIMARY_RGB
    document.documentElement.style.setProperty('--brand', rgb)
    document.documentElement.style.setProperty('--brand-hover', darkenRgb(rgb) || DEFAULT_PRIMARY_HOVER_RGB)
  }, [primaryColor])
}
