/** App-wide default accent when academy has no custom primary color */
export const DEFAULT_PRIMARY = '#0f766e'

/** Legacy default — treat as unset so existing rows pick up the new theme */
export const LEGACY_DEFAULT_PRIMARY = '#2563eb'

/** Matches :root in index.css */
export const DEFAULT_PRIMARY_RGB = '15 118 110'
export const DEFAULT_PRIMARY_HOVER_RGB = '17 94 89'

export function resolvePrimaryColor(color) {
  if (!color) return DEFAULT_PRIMARY
  if (color.toLowerCase() === LEGACY_DEFAULT_PRIMARY) return DEFAULT_PRIMARY
  return color
}

export function darkenRgb(rgbSpaceString, factor = 0.82) {
  const parts = rgbSpaceString.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return rgbSpaceString
  return parts.map((n) => Math.max(0, Math.min(255, Math.round(n * factor)))).join(' ')
}
