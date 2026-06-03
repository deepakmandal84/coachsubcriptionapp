import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { parentApi } from '../api'
import { formatError } from '../utils/formatError'
import { computeProgressOverview } from '../utils/progressStats'

const ParentProgressContext = createContext(null)

export function ParentProgressProvider({ token, children }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [profileFocusTick, setProfileFocusTick] = useState(0)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setErr('')
    parentApi
      .getProgress(token, 24)
      .then(setSummary)
      .catch((e) => setErr(formatError(e)))
      .finally(() => setLoading(false))
  }, [token])

  const stats = useMemo(() => computeProgressOverview(summary), [summary])
  const unit = summary?.profile?.measurementUnit || 'Imperial'
  const entries = summary?.entries || []
  const profile = summary?.profile

  useEffect(() => {
    load()
  }, [load])

  const value = useMemo(
    () => ({
      token,
      summary,
      profile,
      unit,
      entries,
      stats,
      loading,
      err,
      setErr,
      reload: load,
      checkInOpen,
      openCheckIn: () => setCheckInOpen(true),
      closeCheckIn: () => setCheckInOpen(false),
      profileFocusTick,
      openProfileSection: () => setProfileFocusTick((n) => n + 1),
    }),
    [token, summary, profile, unit, entries, stats, loading, err, load, checkInOpen, profileFocusTick]
  )

  return <ParentProgressContext.Provider value={value}>{children}</ParentProgressContext.Provider>
}

export function useParentProgress() {
  const ctx = useContext(ParentProgressContext)
  if (!ctx) throw new Error('useParentProgress must be used within ParentProgressProvider')
  return ctx
}

export function useParentProgressOptional() {
  return useContext(ParentProgressContext)
}
