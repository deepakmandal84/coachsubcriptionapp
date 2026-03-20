export function formatClassUsage(s) {
  if (!s) return ''
  const n = s.monthlyClassesTaken ?? 0
  const cls = n === 1 ? 'class' : 'classes'
  if (s.isUnlimited) {
    return `${n} ${cls} taken this month · Unlimited package`
  }
  const head =
    s.packSessionTotal != null
      ? `${n} ${cls} taken of ${s.packSessionTotal} this month`
      : `${n} ${cls} taken this month`
  const tail = s.sessionsRemaining != null ? ` · ${s.sessionsRemaining} left in pack` : ''
  return head + tail
}
