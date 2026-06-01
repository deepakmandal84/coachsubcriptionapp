import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { parentApi } from '../api'
import { resolvePrimaryColor } from '../constants/theme'
import { useBrandTheme } from '../hooks/useBrandTheme'
import { ParentPortalProvider } from '../context/ParentPortalContext'
import { ParentProgressProvider } from '../context/ParentProgressContext'
import ParentPortalShell from '../components/parentPortal/ParentPortalShell'
import Card from '../components/ui/Card'

export default function ParentPortal() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [attendedClasses, setAttendedClasses] = useState([])
  const [err, setErr] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [scheduleErr, setScheduleErr] = useState('')
  const [attendedErr, setAttendedErr] = useState('')

  const primary = useMemo(() => resolvePrimaryColor(data?.primaryColor), [data?.primaryColor])
  useBrandTheme(data?.primaryColor)

  const reloadAll = useCallback(() => {
    if (!token) return
    parentApi
      .getByToken(token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Invalid or expired link'))
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
    parentApi
      .listSessions(token, { from, to })
      .then(setSessions)
      .catch((e) => {
        setSessions([])
        setScheduleErr(e instanceof Error ? e.message : 'Could not load schedule')
      })
    parentApi
      .listAttendedClasses(token)
      .then(setAttendedClasses)
      .catch((e) => {
        setAttendedClasses([])
        setAttendedErr(e instanceof Error ? e.message : 'Could not load class history')
      })
  }, [token])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  async function handleRequestRenewal() {
    if (!token) return
    setRequesting(true)
    try {
      await parentApi.requestRenewal(token)
      setRequestSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setRequesting(false)
    }
  }

  if (err && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <Card className="max-w-sm w-full text-center p-8">
          <p className="text-red-600 font-medium">Link unavailable</p>
          <p className="text-sm text-slate-600 mt-2">{err}</p>
          <p className="text-xs text-slate-400 mt-4">Ask your coach for a new portal link.</p>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <p className="text-slate-500 animate-pulse">Loading your portal…</p>
      </div>
    )
  }

  const portalValue = {
    token,
    data,
    primary,
    reloadAll,
    sessions,
    attendedClasses,
    scheduleErr,
    attendedErr,
    requestRenewal: handleRequestRenewal,
    requesting,
    requestSent,
  }

  return (
    <ParentPortalProvider value={portalValue}>
      <ParentProgressProvider token={token}>
        <ParentPortalShell />
      </ParentProgressProvider>
    </ParentPortalProvider>
  )
}
