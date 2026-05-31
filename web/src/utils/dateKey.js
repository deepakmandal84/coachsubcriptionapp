/** Local calendar date key YYYY-MM-DD for grouping session dates. */
export function toLocalDateKey(value) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isSameLocalDate(a, b) {
  return toLocalDateKey(a) === toLocalDateKey(b)
}

/** First day of the month containing `date`. */
export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function isBeforeMonth(a, b) {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() < b.getFullYear()
  return a.getMonth() < b.getMonth()
}

export function isAfterMonth(a, b) {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() > b.getFullYear()
  return a.getMonth() > b.getMonth()
}

export function parseJoinDate(iso) {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns array of Date objects for each day in month grid (null = padding). */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = first.getDay()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let day = 1; day <= lastDay; day++) cells.push(new Date(year, month, day))
  return cells
}
