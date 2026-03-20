import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { scheduleApi } from '../api'
import LinkShare from '../components/LinkShare'

function formatSessionTime(s) {
  const t = s.startTime
  if (typeof t === 'string') return t.slice(0, 5)
  const secs = typeof t === 'object' && t != null && 'hours' in t ? t.hours * 3600 + t.minutes * 60 + (t.seconds || 0) : Number(t) || 0
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function PublicSchedule() {
  const { token } = useParams()
  const [view, setView] = useState(null)
  const [err, setErr] = useState('')
  const [bookingId, setBookingId] = useState(null)
  const [contact, setContact] = useState('')
  const [bookErr, setBookErr] = useState('')
  const [bookOk, setBookOk] = useState('')
  const [trial, setTrial] = useState({ name: '', parentName: '', email: '', phone: '', desiredPackageId: '', notes: '' })
  const [trialErr, setTrialErr] = useState('')
  const [trialOk, setTrialOk] = useState('')

  useEffect(() => {
    if (!token) return
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
    scheduleApi
      .listSessions(token, { from, to })
      .then(setView)
      .catch(e => setErr(e instanceof Error ? e.message : 'Invalid or inactive schedule link.'))
  }, [token])

  async function handleBook(sessionId) {
    if (!token) return
    setBookErr('')
    setBookOk('')
    try {
      await scheduleApi.book(token, sessionId, contact)
      setBookOk('You are signed up for this class.')
      setBookingId(null)
      setContact('')
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
      const v = await scheduleApi.listSessions(token, { from, to })
      setView(v)
    } catch (e) {
      setBookErr(e instanceof Error ? e.message : 'Could not book')
    }
  }

  async function handleTrialRequest(e) {
    e.preventDefault()
    if (!token) return
    setTrialErr('')
    setTrialOk('')
    try {
      await scheduleApi.trialRequest(token, {
        name: trial.name,
        parentName: trial.parentName || null,
        email: trial.email || null,
        phone: (trial.phone || '').trim(),
        desiredPackageId: trial.desiredPackageId || null,
        notes: trial.notes || null,
      })
      setTrialOk('Thanks! Your trial request was submitted. Coach will contact you soon.')
      setTrial({ name: '', parentName: '', email: '', phone: '', desiredPackageId: '', notes: '' })
    } catch (e) {
      setTrialErr(e instanceof Error ? e.message : 'Could not submit trial request')
    }
  }

  if (err && !view) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-600">{err}</p>
      </div>
    )
  }
  if (!view) return <div className="min-h-screen flex items-center justify-center p-4">Loading...</div>

  const primary = view.primaryColor || '#2563eb'
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: primary + '30', backgroundColor: primary + '08' }}>
          {view.logoUrl && <img src={view.logoUrl} alt="" className="h-12 mb-2" />}
          <h1 className="text-xl font-semibold" style={{ color: primary }}>
            {view.academyName}
          </h1>
          <p className="text-sm text-gray-500">Browse schedule, packages, and book classes.</p>
          <div className="mt-3">
            <LinkShare url={shareUrl} title="Share schedule" text="Join my class schedule" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          {(view.packages || []).length > 0 && (
            <div className="rounded-xl border bg-gray-50 p-4">
              <h2 className="font-semibold mb-3">Packages</h2>
              <div className="space-y-3 text-sm">
                {view.packages.map(p => (
                  <div key={p.id} className="flex justify-between gap-3 items-start">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-gray-500">
                        {p.type}
                        {p.totalSessions != null ? ` · ${p.totalSessions} classes` : ' · Unlimited'}
                        {` · ${p.validityDays} days`}
                      </div>
                    </div>
                    <div className="font-semibold whitespace-nowrap">${Number(p.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(view.sessions || []).length === 0 && <p className="text-gray-500">No upcoming classes in this range.</p>}
          {(view.sessions || []).map(s => (
            <div key={s.id} className="border rounded-xl p-4 flex flex-col gap-2">
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-gray-600">
                {new Date(s.date).toLocaleDateString()} at {formatSessionTime(s)}
                {s.location ? ` · ${s.location}` : ''} · {s.type}
              </div>
              <div className="text-sm text-gray-500">{s.bookingCount ?? 0} signed up</div>
              {bookingId === s.id ? (
                <div className="space-y-2 pt-2 border-t">
                  <input
                    type="text"
                    placeholder="Email or phone number"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {bookErr && <p className="text-sm text-red-600">{bookErr}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleBook(s.id)}
                      className="px-3 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: primary }}
                    >
                      Confirm
                    </button>
                    <button type="button" onClick={() => { setBookingId(null); setBookErr('') }} className="px-3 py-2 text-sm border rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setBookingId(s.id); setBookErr(''); setBookOk('') }}
                  className="text-sm self-start font-medium px-3 py-2 rounded-lg border"
                  style={{ color: primary }}
                >
                  Sign up with email/phone
                </button>
              )}
            </div>
          ))}
          {bookOk && <p className="text-green-600 text-sm">{bookOk}</p>}
          <div className="rounded-xl border-t pt-4">
            <h2 className="font-semibold mb-2">New here? Request a trial</h2>
            <form onSubmit={handleTrialRequest} className="space-y-2">
              <input required placeholder="Student name" value={trial.name} onChange={e => setTrial(t => ({ ...t, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Parent name" value={trial.parentName} onChange={e => setTrial(t => ({ ...t, parentName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input type="email" placeholder="Email (optional)" value={trial.email} onChange={e => setTrial(t => ({ ...t, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Phone (optional)" value={trial.phone} onChange={e => setTrial(t => ({ ...t, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <p className="text-xs text-gray-500">Enter either phone or email for trial contact.</p>
              <select value={trial.desiredPackageId} onChange={e => setTrial(t => ({ ...t, desiredPackageId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Desired package (optional)</option>
                {(view.packages || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <textarea placeholder="Notes" rows={2} value={trial.notes} onChange={e => setTrial(t => ({ ...t, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              {trialErr && <p className="text-red-600 text-sm">{trialErr}</p>}
              {trialOk && <p className="text-green-600 text-sm">{trialOk}</p>}
              <button type="submit" className="px-3 py-2 rounded-lg text-white text-sm w-full" style={{ backgroundColor: primary }}>Submit trial request</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
