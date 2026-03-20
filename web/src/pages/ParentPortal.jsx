import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { parentApi } from '../api'
import { formatClassUsage } from '../utils/classUsage'
import LinkShare from '../components/LinkShare'

function formatSessionTime(s) {
  const t = s.startTime
  if (typeof t === 'string') return t.length >= 5 ? t.slice(0, 5) : t
  const secs = Number(t) || 0
  return `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}`
}

export default function ParentPortal() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [err, setErr] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [bookErr, setBookErr] = useState('')
  const [bookOk, setBookOk] = useState('')
  const [scheduleErr, setScheduleErr] = useState('')

  const reloadAll = useCallback(() => {
    if (!token) return
    parentApi
      .getByToken(token)
      .then(setData)
      .catch(e => setErr(e instanceof Error ? e.message : 'Invalid or expired link'))
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
    parentApi
      .listSessions(token, { from, to })
      .then(setSessions)
      .catch(e => {
        setSessions([])
        setScheduleErr(e instanceof Error ? e.message : 'Could not load schedule')
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

  async function handleBook(sessionId) {
    if (!token) return
    setBookErr('')
    setBookOk('')
    try {
      await parentApi.bookSession(token, sessionId, null)
      setBookOk("You're signed up. Your coach will see your name on the roster.")
      setBookingId(null)
      reloadAll()
    } catch (e) {
      setBookErr(e instanceof Error ? e.message : 'Could not book')
    }
  }

  if (err && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-600">{err}</p>
      </div>
    )
  }
  if (!data) return <div className="min-h-screen flex items-center justify-center p-4">Loading...</div>

  const primary = data.primaryColor || '#2563eb'
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ maxWidth: '28rem' }}>
        <div className="p-6 border-b bg-white" style={{ borderColor: primary + '30', backgroundColor: primary + '08' }}>
          {data.logoUrl && <img src={data.logoUrl} alt="" className="h-12 mb-2" />}
          <h1 className="text-xl font-semibold" style={{ color: primary }}>
            {data.academyName}
          </h1>
          <p className="text-sm text-gray-500">Parent portal</p>
          <div className="mt-3">
            <LinkShare
              url={shareUrl}
              title="Share parent portal"
              text="My coach schedule and class bookings"
              variant="compact"
            />
          </div>
        </div>
        <div className="p-6 space-y-4 bg-white">
          <h2 className="font-medium">Student</h2>
          <p className="text-lg">{data.studentName}</p>
          {data.classUsage && (
            <p className="text-sm text-gray-700 border rounded-lg px-3 py-2 bg-gray-50">{formatClassUsage(data.classUsage)}</p>
          )}
          {data.packageName && (
            <>
              <h2 className="font-medium pt-2">Package</h2>
              <p>{data.packageName}</p>
            </>
          )}
          {data.remainingSessions != null && (
            <p>
              <span className="text-gray-500">Remaining sessions:</span> {data.remainingSessions}
            </p>
          )}
          {data.expiryDate && (
            <p>
              <span className="text-gray-500">Expires:</span> {new Date(data.expiryDate).toLocaleDateString()}
            </p>
          )}
          <p>
            <span className="text-gray-500">Payment status:</span>{' '}
            <span className={data.paymentStatus === 'Due' ? 'text-amber-600 font-medium' : ''}>{data.paymentStatus}</span>
          </p>
          <div className="pt-4 border-t">
            <h2 className="font-medium mb-2">Book a class</h2>
            <p className="text-xs text-gray-500 mb-3">This private link is already tied to {data.studentName}. Just tap sign up.</p>
            {scheduleErr && <p className="text-xs text-red-600 mb-2">{scheduleErr}</p>}
            {sessions.length === 0 && <p className="text-sm text-gray-500">No scheduled classes in the next two months.</p>}
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-gray-600 mt-1">
                    {new Date(s.date).toLocaleDateString()} at {formatSessionTime(s)}
                    {s.location ? ` · ${s.location}` : ''}
                  </div>
                  {bookingId === s.id ? (
                    <div className="mt-2 space-y-2">
                      {bookErr && <p className="text-red-600 text-xs">{bookErr}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleBook(s.id)}
                          className="px-3 py-2 rounded text-white text-sm"
                          style={{ backgroundColor: primary }}
                        >
                          Confirm signup
                        </button>
                        <button type="button" onClick={() => { setBookingId(null); setBookErr('') }} className="px-3 py-2 border rounded text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setBookingId(s.id); setBookErr(''); setBookOk('') }}
                      className="mt-2 font-medium text-sm"
                      style={{ color: primary }}
                    >
                      Confirm signup
                    </button>
                  )}
                </div>
              ))}
            </div>
            {bookOk && <p className="text-green-600 text-sm pt-2">{bookOk}</p>}
          </div>
          <div className="pt-4">
            <button
              type="button"
              onClick={handleRequestRenewal}
              disabled={requesting || requestSent}
              className="w-full py-2 rounded text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {requestSent ? 'Request sent' : 'Request renewal'}
            </button>
            <p className="text-xs text-gray-500 mt-2">Sends a message to your coach to arrange renewal.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
