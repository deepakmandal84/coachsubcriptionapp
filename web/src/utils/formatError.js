/** Turn API error bodies into short user-facing text. */
export function formatError(err, fallback = 'Something went wrong. Please try again.') {
  if (!(err instanceof Error)) return fallback
  const raw = err.message?.trim()
  if (!raw) return fallback
  try {
    const j = JSON.parse(raw)
    if (typeof j === 'string') return j
    if (j.title) return j.title
    if (j.message) return j.message
    if (j.errors && typeof j.errors === 'object') {
      const first = Object.values(j.errors).flat()[0]
      if (first) return String(first)
    }
  } catch {
    /* plain text */
  }
  if (raw.length > 120) return fallback
  return raw
}
