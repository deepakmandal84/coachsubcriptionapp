import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi, studentsApi } from '../api'
import { formatClassUsage } from '../utils/classUsage'

function formatTime(session) {
  const t = session.startTime
  if (typeof t === 'string') return t.length >= 5 ? t.slice(0, 5) : t
  const secs = Number(t) || 0
  return `${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}`
}

export default function SessionAttendance() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState([])
  const [usageByStudent, setUsageByStudent] = useState({})

  useEffect(() => {
    if (!id) return
    sessionsApi.get(id).then(setSession).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
    studentsApi.list({ status: 'Active' }).then(setStudents).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!session) return
    const existing = new Map((session.attendances || []).map(a => [a.studentId, { present: a.present, sessionsConsumed: a.sessionsConsumed }]))
    const booked = session.bookings || []
    const idSet = new Set(students.map(s => s.id))
    for (const b of booked) idSet.add(b.studentId)
    const next = [...idSet].map(studentId => {
      const s = students.find(st => st.id === studentId)
      const bk = booked.find(b => b.studentId === studentId)
      const e = existing.get(studentId)
      return {
        studentId,
        studentName: s?.name ?? bk?.studentName ?? 'Unknown',
        signedUp: !!bk,
        present: e?.present ?? false,
        sessionsConsumed: e?.sessionsConsumed ?? 1,
      }
    })
    next.sort((a, b) => Number(b.signedUp) - Number(a.signedUp) || a.studentName.localeCompare(b.studentName))
    setItems(next)
  }, [session, students])

  const rosterKey = useMemo(() => {
    if (!session) return ''
    const ids = new Set(students.map(s => s.id))
    for (const b of session.bookings || []) ids.add(b.studentId)
    return [...ids].sort().join(',')
  }, [session, students])

  useEffect(() => {
    if (!id || !rosterKey) return
    const rosterIds = rosterKey.split(',').filter(Boolean)
    let cancelled = false
    studentsApi
      .batchClassUsage(rosterIds)
      .then(r => {
        if (cancelled) return
        const m = {}
        for (const row of r.results || []) m[row.studentId] = row.summary
        setUsageByStudent(m)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [id, rosterKey])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    try {
      const resp = await sessionsApi.setAttendance(
        id,
        items.map(i => ({
          studentId: i.studentId,
          present: i.present,
          sessionsConsumed: i.present ? i.sessionsConsumed : 0,
        })),
      )
      const updated = await sessionsApi.get(id)
      setSession(updated)
      if (resp?.studentUsages?.length) {
        const m = { ...usageByStudent }
        for (const row of resp.studentUsages) m[row.studentId] = row.summary
        setUsageByStudent(m)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  function setItem(studentId, patch) {
    setItems(prev => prev.map(i => (i.studentId === studentId ? { ...i, ...patch } : i)))
  }

  if (!session) return <p>{err || 'Loading...'}</p>

  const timeStr = formatTime(session)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button type="button" onClick={() => navigate('/sessions')} className="text-blue-600 text-sm hover:underline mb-1">
            ← Sessions
          </button>
          <h1 className="text-2xl font-semibold">Attendance: {session.title}</h1>
          <p className="text-gray-500">
            {new Date(session.date).toLocaleDateString()} at {timeStr} · {session.type}
          </p>
        </div>
        <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          Save
        </button>
      </div>
      {(session.bookings || []).length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm">
          <div className="font-medium text-blue-900 mb-1">Signed up</div>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            {(session.bookings || []).map(b => (
              <li key={b.id}>
                {b.studentName}
                {b.studentPhoneLast4 ? ` (···${b.studentPhoneLast4})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <div className="space-y-3">
        <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Student</th>
                <th className="text-left p-3 w-24">Signed up</th>
                <th className="text-left p-3 w-24">Present</th>
                <th className="text-left p-3 w-28">Sessions used</th>
                <th className="text-left p-3 min-w-[14rem]">This month / pack</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.studentId} className="border-b last:border-0">
                  <td className="p-3">{i.studentName}</td>
                  <td className="p-3">{i.signedUp ? 'Yes' : '—'}</td>
                  <td className="p-3">
                    <input type="checkbox" checked={i.present} onChange={e => setItem(i.studentId, { present: e.target.checked })} />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      value={i.sessionsConsumed}
                      onChange={e => setItem(i.studentId, { sessionsConsumed: Number(e.target.value) })}
                      className="w-16 border rounded px-2 py-1"
                      disabled={!i.present}
                    />
                  </td>
                  <td className="p-3 text-gray-700">{formatClassUsage(usageByStudent[i.studentId]) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {items.map(i => (
            <div key={i.studentId} className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{i.studentName}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Signed up: {i.signedUp ? 'Yes' : '—'}
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={i.present} onChange={e => setItem(i.studentId, { present: e.target.checked })} />
                  Present
                </label>
              </div>
              <div className="pt-3 flex items-center gap-3">
                <div className="text-sm text-gray-600 whitespace-nowrap">Sessions used</div>
                <input
                  type="number"
                  min="0"
                  value={i.sessionsConsumed}
                  onChange={e => setItem(i.studentId, { sessionsConsumed: Number(e.target.value) })}
                  className="w-24 border rounded-lg px-3 py-2"
                  disabled={!i.present}
                />
              </div>
              <div className="text-sm text-gray-700 mt-2">
                {formatClassUsage(usageByStudent[i.studentId]) || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
