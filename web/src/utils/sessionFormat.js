import { formatApiDateDisplay, toLocalDateKey } from './dateKey'

export function formatSessionTime(s) {
  const t = s.startTime
  if (typeof t === 'string') {
    const parts = t.split(':')
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    return t.length >= 5 ? t.slice(0, 5) : t
  }
  const secs = Number(t) || 0
  return `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}`
}

export function formatSessionDate(date, options) {
  return formatApiDateDisplay(date, options)
}

export function sessionDateForInput(date) {
  return toLocalDateKey(date)
}
