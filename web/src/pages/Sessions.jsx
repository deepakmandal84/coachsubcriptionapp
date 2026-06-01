import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { sessionsApi, coachApi } from '../api'
import { useAuth } from '../AuthContext'
import { useAcademyPermissions } from '../hooks/useAcademyPermissions'
import { useAppPaths } from '../hooks/useAppPaths'
import { FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiLayers, FiTrash2, FiUsers } from 'react-icons/fi'
import { localDateInputValue } from '../utils/dateKey'
import { formatSessionDate, formatSessionTime, sessionDateForInput } from '../utils/sessionFormat'
import BulkSessionsModal from '../components/sessions/BulkSessionsModal'
import { useToast } from '../context/ToastContext'

export default function Sessions() {
  const paths = useAppPaths()
  const { coach } = useAuth()
  const isStaffCoach = coach?.role === 'Coach' && !!coach?.clubTenantId
  const isClubOwner = coach?.role === 'Coach' && !coach?.clubTenantId
  const { canManageSessions } = useAcademyPermissions()
  const toast = useToast()
  const [filterCoachId, setFilterCoachId] = useState('')
  const staffFilterDefaultDone = useRef(false)
  const [list, setList] = useState([])
  const [team, setTeam] = useState([])
  const [err, setErr] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')
  const [modal, setModal] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    date: localDateInputValue(),
    startTime: '09:00',
    type: 'Group',
    title: '',
    location: '',
    coachIds: [],
  })

  function load() {
    const now = new Date()
    const from = localDateInputValue(new Date(now.getFullYear(), now.getMonth() - 3, 1))
    const to = localDateInputValue(new Date(now.getFullYear(), now.getMonth() + 2, 0))
    const params = { from, to }
    if (filterCoachId) params.assignedCoachId = filterCoachId
    sessionsApi
      .list(params)
      .then((data) => {
        setList(data)
        setErr('')
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => {
    if (!coach?.id) return
    if (isStaffCoach && team.length === 0) return
    if (isStaffCoach && !staffFilterDefaultDone.current && filterCoachId === '') {
      staffFilterDefaultDone.current = true
      setFilterCoachId(String(coach.id))
      return
    }
    load()
  }, [filterCoachId, isStaffCoach, coach?.id, team.length])

  useEffect(() => {
    if (!canManageSessions) return
    coachApi.team().then(setTeam).catch(() => setTeam([]))
  }, [canManageSessions])

  function formatRowTime(s) {
    return formatSessionTime(s)
  }

  function openCreate() {
    const ownerId = coach?.id ? String(coach.id) : ''
    setForm({
      date: localDateInputValue(),
      startTime: '09:00',
      type: 'Group',
      title: '',
      location: '',
      coachIds: ownerId ? [ownerId] : [],
    })
    setEditing(null)
    setModal('create')
  }

  function openEdit(s) {
    const time = formatSessionTime(s)
    const ids = (s.assignedCoachIds || []).map(String)
    setForm({
      date: sessionDateForInput(s.date),
      startTime: time,
      type: s.type,
      title: s.title,
      location: s.location ?? '',
      coachIds: ids.length ? ids : (coach?.id ? [String(coach.id)] : []),
    })
    setEditing(s)
    setModal('edit')
  }

  function toggleCoachId(id) {
    const sid = String(id)
    setForm(f => {
      const set = new Set((f.coachIds || []).map(String))
      if (set.has(sid)) set.delete(sid)
      else set.add(sid)
      return { ...f, coachIds: [...set] }
    })
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (canManageSessions && (!form.coachIds || form.coachIds.length === 0)) {
      setErr('Select at least one coach for this session.')
      return
    }
    try {
      await sessionsApi.create({
        date: form.date,
        startTime: form.startTime,
        type: form.type,
        title: form.title,
        location: form.location || undefined,
        coachIds: canManageSessions ? form.coachIds : undefined,
      })
      setModal(null)
      setErr('')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    if (canManageSessions && (!form.coachIds || form.coachIds.length === 0)) {
      setErr('Select at least one coach for this session.')
      return
    }
    try {
      await sessionsApi.update(editing.id, {
        date: form.date,
        startTime: form.startTime,
        type: form.type,
        title: form.title,
        location: form.location || undefined,
        coachIds: canManageSessions ? form.coachIds : undefined,
      })
      setModal(null)
      setErr('')
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this session?')) return
    try {
      await sessionsApi.delete(id)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  const historySessions = list.filter(s => (s.attendanceCount ?? 0) > 0)
  const upcomingSessions = list.filter(s => (s.attendanceCount ?? 0) === 0)
  const shownSessions = activeTab === 'history' ? historySessions : upcomingSessions
  const shownEmptyMsg = activeTab === 'history' ? 'No completed sessions yet.' : 'No upcoming sessions in this range.'

  const coachNames = s => (s.coachNames && s.coachNames.length ? s.coachNames.join(', ') : '—')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-brand-subtle text-brand">
            <FiCalendar />
          </span>
          Sessions
        </h1>
        {activeTab === 'upcoming' && canManageSessions && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-800 rounded-xl hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
            >
              <FiLayers />
              Bulk add
            </button>
            <button onClick={openCreate} className="px-4 py-2 btn-brand text-white rounded-xl hover:opacity-95 shadow-sm">
              New session
            </button>
          </div>
        )}
      </div>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {canManageSessions && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
          <label className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
            <span className="font-medium whitespace-nowrap">Show sessions for</span>
            <select
              value={filterCoachId}
              onChange={e => setFilterCoachId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[12rem]"
            >
              <option value="">All coaches</option>
              {team.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <p className="text-sm text-gray-500">
            {isClubOwner
              ? 'Filter the schedule by coach, or All to see every session.'
              : 'Defaults to you; choose All coaches or another coach to see their sessions.'}
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'upcoming' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-brand' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <FiClock className="text-base" />
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'history' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-brand' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <FiCheckCircle className="text-base" />
          History ({historySessions.length})
        </button>
      </div>

      <div className="space-y-3">
        <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Coaches</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3 w-24">Booked</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shownSessions.map(s => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3">{formatSessionDate(s.date)}</td>
                  <td className="p-3">{formatRowTime(s)}</td>
                  <td className="p-3">{s.type}</td>
                  <td className="p-3">{s.title}</td>
                  <td className="p-3 text-sm text-gray-700 max-w-[10rem]">{coachNames(s)}</td>
                  <td className="p-3">{s.location ?? '–'}</td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-1 text-gray-700">
                      <FiUsers className="text-gray-500" />
                      {s.bookingCount ?? 0}
                    </div>
                    {activeTab === 'history' && (
                      <div className="text-xs text-green-700 font-medium mt-0.5">Completed</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Link to={paths.sessionAttendance(s.id)} className="inline-flex items-center gap-1 text-brand mr-3 hover:underline"><FiCheckCircle />Attendance</Link>
                    {canManageSessions && (
                      <>
                        <button type="button" onClick={() => openEdit(s)} className="inline-flex items-center gap-1 text-brand mr-3 hover:underline"><FiEdit2 />Edit</button>
                        <button type="button" onClick={() => handleDelete(s.id)} className="inline-flex items-center gap-1 text-red-600 hover:underline"><FiTrash2 />Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {shownSessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    {shownEmptyMsg}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {shownSessions.map(s => {
            const time = formatRowTime(s)
            return (
              <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm border-brand-subtle">
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatSessionDate(s.date)} at {time} · {s.type}
                  {s.location ? ` · ${s.location}` : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">Coaches: {coachNames(s)}</div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="text-sm text-gray-500 inline-flex items-center gap-1"><FiUsers />{s.bookingCount ?? 0} booked</div>
                  {activeTab === 'history' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-medium whitespace-nowrap">
                      Completed
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-3">
                  <Link to={paths.sessionAttendance(s.id)} className="flex-1 px-3 py-2 rounded-xl border border-brand-subtle text-brand bg-brand-subtle text-center inline-flex items-center justify-center gap-1"><FiCheckCircle />Attendance</Link>
                  {canManageSessions && (
                    <button type="button" onClick={() => openEdit(s)} className="flex-1 px-3 py-2 rounded-xl border border-brand-subtle text-brand bg-brand-subtle inline-flex items-center justify-center gap-1"><FiEdit2 />Edit</button>
                  )}
                </div>
                {canManageSessions && (
                  <div className="pt-2">
                    <button type="button" onClick={() => handleDelete(s.id)} className="w-full px-3 py-2 rounded-xl border border-red-100 text-red-700 bg-red-50 inline-flex items-center justify-center gap-1"><FiTrash2 />Delete</button>
                  </div>
                )}
              </div>
            )
          })}

          {shownSessions.length === 0 && (
            <div className="bg-white rounded-2xl border p-4 text-center text-gray-500">
              {shownEmptyMsg}
            </div>
          )}
        </div>
      </div>

      {bulkOpen && (
        <BulkSessionsModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          team={team}
          canManageSessions={canManageSessions}
          coachId={coach?.id}
          existingSessions={list}
          onCreated={(count) => {
            toast.success(`Created ${count} session${count === 1 ? '' : 's'}`)
            load()
          }}
        />
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'create' ? 'New session' : 'Edit session'}</h2>
            <form onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded px-3 py-2">
                  <option value="Group">Group</option>
                  <option value="Private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              {canManageSessions && team.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coaches running this session *</label>
                  <p className="text-xs text-gray-500 mb-2">Any selected coach can open attendance when the class runs.</p>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {team.map(m => {
                      const checked = (form.coachIds || []).map(String).includes(String(m.id))
                      return (
                        <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={checked} onChange={() => toggleCoachId(m.id)} />
                          <span className="text-sm">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-gray-500 ml-2">{m.email}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 btn-brand text-white rounded-lg hover:opacity-95">{modal === 'create' ? 'Create' : 'Save'}</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
