import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi, studentsApi } from '../api'
import { useAppPaths } from '../hooks/useAppPaths'
import { formatClassUsage } from '../utils/classUsage'
import { formatSessionDate, formatSessionTime } from '../utils/sessionFormat'
import SessionClientsMultiSelect from '../components/sessions/SessionClientsMultiSelect'
import Button from '../components/ui/Button'

function buildRosterItems(session, students) {
  const existing = new Map(
    (session.attendances || []).map((a) => [String(a.studentId), { present: a.present, sessionsConsumed: a.sessionsConsumed }]),
  )
  const booked = session.bookings || []
  const idSet = new Set()
  for (const b of booked) idSet.add(String(b.studentId))
  for (const a of session.attendances || []) idSet.add(String(a.studentId))

  const next = [...idSet].map((studentId) => {
    const s = students.find((st) => String(st.id) === studentId)
    const bk = booked.find((b) => String(b.studentId) === studentId)
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
  return next
}

export default function SessionAttendance() {
  const { id } = useParams()
  const navigate = useNavigate()
  const paths = useAppPaths()
  const [session, setSession] = useState(null)
  const [students, setStudents] = useState([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState([])
  const [usageByStudent, setUsageByStudent] = useState({})
  const [showAddOthers, setShowAddOthers] = useState(false)
  const [addIds, setAddIds] = useState([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!id) return
    setErr('')
    sessionsApi
      .get(id)
      .then(setSession)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('403')) setErr('You do not have access to this session.')
        else setErr(msg || 'Failed to load session')
      })
    studentsApi.list({ roster: 'active' }).then(setStudents).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!session) return
    setItems(buildRosterItems(session, students))
  }, [session, students])

  const rosterKey = useMemo(() => {
    if (!session) return ''
    const ids = new Set()
    for (const b of session.bookings || []) ids.add(String(b.studentId))
    for (const a of session.attendances || []) ids.add(String(a.studentId))
    return [...ids].sort().join(',')
  }, [session])

  const rosterStudentIds = useMemo(
    () => items.map((i) => String(i.studentId)),
    [items],
  )

  useEffect(() => {
    if (!id || !rosterKey) return
    const rosterIds = rosterKey.split(',').filter(Boolean)
    let cancelled = false
    studentsApi
      .batchClassUsage(rosterIds)
      .then((r) => {
        if (cancelled) return
        const m = {}
        for (const row of r.results || []) m[row.studentId] = row.summary
        setUsageByStudent(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id, rosterKey])

  async function handleSave() {
    if (!id || !session?.canMarkAttendance) return
    setSaving(true)
    try {
      const resp = await sessionsApi.setAttendance(
        id,
        items.map((i) => ({
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

  async function handleAddOthers() {
    if (!id || !session?.canMarkAttendance || addIds.length === 0) return
    setAdding(true)
    setErr('')
    try {
      const updated = await sessionsApi.addBookings(id, addIds)
      setSession(updated)
      setAddIds([])
      setShowAddOthers(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add clients')
    } finally {
      setAdding(false)
    }
  }

  function setItem(studentId, patch) {
    setItems((prev) => prev.map((i) => (String(i.studentId) === String(studentId) ? { ...i, ...patch } : i)))
  }

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-gray-700">{err || 'Loading...'}</p>
        {err && (
          <button type="button" onClick={() => navigate(paths.sessions)} className="mt-4 text-brand hover:underline">
            ← Back to sessions
          </button>
        )}
      </div>
    )
  }

  const timeStr = formatSessionTime(session)
  const canEdit = session.canMarkAttendance === true
  const typeLabel = session.type === 'Private' ? 'Personal Training' : session.type

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button type="button" onClick={() => navigate(paths.sessions)} className="text-brand text-sm hover:underline mb-1">
            ← Sessions
          </button>
          <h1 className="text-2xl font-semibold">Attendance: {session.title}</h1>
          <p className="text-gray-500">
            {formatSessionDate(session.date)} at {timeStr} · {typeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canEdit}
          className="px-4 py-2 btn-brand text-white rounded-lg hover:opacity-95 disabled:opacity-50"
        >
          Save
        </button>
      </div>
      {!canEdit && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900">
          View-only: only coaches assigned to this session (or the club owner) can mark attendance.
        </div>
      )}
      {(session.bookings || []).length > 0 && (
        <div className="mb-4 p-4 bg-brand-subtle border border-brand-subtle rounded-lg text-sm">
          <div className="font-medium text-slate-900 mb-1">On the roster</div>
          <ul className="list-disc list-inside text-brand space-y-1">
            {(session.bookings || []).map((b) => (
              <li key={b.id}>
                {b.studentName}
                {b.studentPhoneLast4 ? ` (···${b.studentPhoneLast4})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="mb-4">
          {!showAddOthers ? (
            <button
              type="button"
              onClick={() => {
                setShowAddOthers(true)
                setAddIds([])
                setErr('')
              }}
              className="text-sm font-medium text-brand hover:underline"
            >
              Did anyone else join? →
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-900">Add clients to this session</p>
              <SessionClientsMultiSelect
                students={students}
                selectedIds={addIds}
                onChange={setAddIds}
                excludeIds={rosterStudentIds}
                hint="Select one or more clients. They will be added to the roster and can be marked present."
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={adding || addIds.length === 0} onClick={handleAddOthers}>
                  {adding ? 'Adding…' : 'Add to session'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddOthers(false)
                    setAddIds([])
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-red-600 mb-2">{err}</p>}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          No one on the roster yet.
          {canEdit && ' Use “Did anyone else join?” to add clients, or assign them when creating the session.'}
        </div>
      )}

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
              {items.map((i) => (
                <tr key={i.studentId} className="border-b last:border-0">
                  <td className="p-3">{i.studentName}</td>
                  <td className="p-3">{i.signedUp ? 'Yes' : '—'}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={i.present}
                      disabled={!canEdit}
                      onChange={(e) => setItem(i.studentId, { present: e.target.checked })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      value={i.sessionsConsumed}
                      onChange={(e) => setItem(i.studentId, { sessionsConsumed: Number(e.target.value) })}
                      className="w-16 border rounded px-2 py-1"
                      disabled={!canEdit || !i.present}
                    />
                  </td>
                  <td className="p-3 text-gray-700">{formatClassUsage(usageByStudent[i.studentId]) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {items.map((i) => (
            <div key={i.studentId} className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{i.studentName}</div>
                  <div className="text-sm text-gray-500 mt-1">Signed up: {i.signedUp ? 'Yes' : '—'}</div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={i.present}
                    disabled={!canEdit}
                    onChange={(e) => setItem(i.studentId, { present: e.target.checked })}
                  />
                  Present
                </label>
              </div>
              <div className="pt-3 flex items-center gap-3">
                <div className="text-sm text-gray-600 whitespace-nowrap">Sessions used</div>
                <input
                  type="number"
                  min="0"
                  value={i.sessionsConsumed}
                  onChange={(e) => setItem(i.studentId, { sessionsConsumed: Number(e.target.value) })}
                  className="w-24 border rounded-lg px-3 py-2"
                  disabled={!canEdit || !i.present}
                />
              </div>
              <div className="text-sm text-gray-700 mt-2">{formatClassUsage(usageByStudent[i.studentId]) || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
