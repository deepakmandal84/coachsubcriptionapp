import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sessionsApi } from '../api'
import { FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'

export default function Sessions() {
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', type: 'Group', title: '', location: '' })

  function load() {
    const now = new Date()
    // Include a bit of past data so completed sessions show up in History.
    const from = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)
    sessionsApi.list({ from, to }).then(setList).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ date: new Date().toISOString().slice(0, 10), startTime: '09:00', type: 'Group', title: '', location: '' })
    setEditing(null)
    setModal('create')
  }

  function openEdit(s) {
    const d = new Date(s.date)
    const t = s.startTime
    const time = typeof t === 'string' ? t : `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`
    setForm({ date: d.toISOString().slice(0, 10), startTime: time, type: s.type, title: s.title, location: s.location ?? '' })
    setEditing(s)
    setModal('edit')
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await sessionsApi.create({
        date: form.date,
        startTime: form.startTime,
        type: form.type,
        title: form.title,
        location: form.location || undefined,
      })
      setModal(null)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    try {
      await sessionsApi.update(editing.id, {
        date: form.date,
        startTime: form.startTime,
        type: form.type,
        title: form.title,
        location: form.location || undefined,
      })
      setModal(null)
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-100 text-blue-700">
            <FiCalendar />
          </span>
          Sessions
        </h1>
        {activeTab === 'upcoming' && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm">New session</button>
        )}
      </div>
      {err && <p className="text-red-600 mb-2">{err}</p>}

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'upcoming' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <FiClock className="text-base" />
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'history' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
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
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3 w-24">Booked</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shownSessions.map(s => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="p-3">{typeof s.startTime === 'string' ? s.startTime : `${String(Math.floor(s.startTime / 3600)).padStart(2, '0')}:${String(Math.floor((s.startTime % 3600) / 60)).padStart(2, '0')}`}</td>
                  <td className="p-3">{s.type}</td>
                  <td className="p-3">{s.title}</td>
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
                    <Link to={`/sessions/${s.id}/attendance`} className="inline-flex items-center gap-1 text-indigo-600 mr-3 hover:underline"><FiCheckCircle />Attendance</Link>
                    <button onClick={() => openEdit(s)} className="inline-flex items-center gap-1 text-blue-600 mr-3 hover:underline"><FiEdit2 />Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="inline-flex items-center gap-1 text-red-600 hover:underline"><FiTrash2 />Delete</button>
                  </td>
                </tr>
              ))}
              {shownSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    {shownEmptyMsg}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {shownSessions.map(s => {
            const time = typeof s.startTime === 'string' ? s.startTime : `${String(Math.floor(s.startTime / 3600)).padStart(2, '0')}:${String(Math.floor((s.startTime % 3600) / 60)).padStart(2, '0')}`
            return (
              <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm border-blue-100">
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(s.date).toLocaleDateString()} at {time} · {s.type}
                  {s.location ? ` · ${s.location}` : ''}
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <div className="text-sm text-gray-500 inline-flex items-center gap-1"><FiUsers />{s.bookingCount ?? 0} booked</div>
                  {activeTab === 'history' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-medium whitespace-nowrap">
                      Completed
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-3">
                  <Link to={`/sessions/${s.id}/attendance`} className="flex-1 px-3 py-2 rounded-xl border border-indigo-100 text-indigo-700 bg-indigo-50 text-center inline-flex items-center justify-center gap-1"><FiCheckCircle />Attendance</Link>
                  <button onClick={() => openEdit(s)} className="flex-1 px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50 inline-flex items-center justify-center gap-1"><FiEdit2 />Edit</button>
                </div>
                <div className="pt-2">
                  <button onClick={() => handleDelete(s.id)} className="w-full px-3 py-2 rounded-xl border border-red-100 text-red-700 bg-red-50 inline-flex items-center justify-center gap-1"><FiTrash2 />Delete</button>
                </div>
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
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
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{modal === 'create' ? 'Create' : 'Save'}</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
