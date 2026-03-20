import { useEffect, useState, useRef } from 'react'
import { studentsApi } from '../api'

export default function Students() {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', parentName: '', email: '', phone: '', notes: '', tags: '', status: 'Active' })
  const loadVersionRef = useRef(0)

  function load() {
    const version = ++loadVersionRef.current
    studentsApi.list({ search: search || undefined, status: status || undefined })
      .then(data => {
        if (version === loadVersionRef.current) setList(data)
      })
      .catch(e => { if (version === loadVersionRef.current) setErr(e instanceof Error ? e.message : 'Failed') })
  }

  useEffect(() => { load() }, [search, status])

  function openCreate() {
    setForm({ name: '', parentName: '', email: '', phone: '', notes: '', tags: '', status: 'Active' })
    setEditing(null)
    setModal('create')
  }

  function openEdit(s) {
    setForm({ name: s.name, parentName: s.parentName ?? '', email: s.email ?? '', phone: s.phone ?? '', notes: s.notes ?? '', tags: s.tags ?? '', status: s.status })
    setEditing(s)
    setModal('edit')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setErr('')
    try {
      // Send only non-empty optional fields so API validation is happy
      const payload = {
        name: form.name.trim(),
        parentName: form.parentName?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        notes: form.notes?.trim() || null,
        tags: form.tags?.trim() || null,
        status: form.status
      }
      const created = await studentsApi.create(payload)
      setModal(null)
      // Build row from response (API returns camelCase)
      const newRow = {
        id: created.id,
        name: created.name ?? form.name.trim(),
        parentName: created.parentName ?? form.parentName?.trim() ?? null,
        email: created.email ?? form.email?.trim() ?? null,
        phone: created.phone ?? form.phone?.trim() ?? null,
        status: created.status ?? form.status,
        tags: created.tags ?? form.tags?.trim() ?? null,
        createdAt: created.createdAt ?? new Date().toISOString()
      }
      setList(prev => [newRow, ...prev])
      setSuccess('Student added!')
      setTimeout(() => setSuccess(''), 3000)
      // Refetch from server so table shows persisted data (avoids stale list overwriting)
      setTimeout(() => load(), 400)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add student')
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    try {
      await studentsApi.update(editing.id, form)
      setModal(null)
      load()
      setSuccess('Student updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student?')) return
    try {
      await studentsApi.delete(id)
      load()
      setSuccess('Student deleted!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Students</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add student</button>
      </div>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {success && <p className="text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2 mb-2">{success}</p>}
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-3 py-2 flex-1 max-w-xs" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Trial">Trial</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
      <div className="space-y-3">
        <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Parent</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.parentName ?? '–'}</td>
                  <td className="p-3">{s.email ?? '–'}</td>
                  <td className="p-3">{s.phone ?? '–'}</td>
                  <td className="p-3">{s.status}</td>
                  <td className="p-3">
                    <button onClick={() => openEdit(s)} className="text-blue-600 mr-2 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {list.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>{s.parentName ? `Parent: ${s.parentName}` : 'Parent: –'}</div>
                    <div>{s.email ? `Email: ${s.email}` : 'Email: –'}</div>
                    <div>{s.phone ? `Phone: ${s.phone}` : 'Phone: –'}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {s.status === 'Active' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">Active</span>
                  ) : s.status === 'Trial' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">Trial</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-100">Inactive</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button onClick={() => openEdit(s)} className="flex-1 px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50">Edit</button>
                <button onClick={() => handleDelete(s.id)} className="flex-1 px-3 py-2 rounded-xl border border-red-100 text-red-700 bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'create' ? 'New student' : 'Edit student'}</h2>
            <form onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Parent name</label>
                <input value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="e.g. basketball, group A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded px-3 py-2">
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
