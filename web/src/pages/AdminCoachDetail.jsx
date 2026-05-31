import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { adminApi } from '../api'

export default function AdminCoachDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { coach } = useAuth()
  const [data, setData] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('subscriptions')
  const [edit, setEdit] = useState({ academyName: '', email: '', ownerName: '', newPassword: '', isActive: true })
  const [editBusy, setEditBusy] = useState(false)

  function load() {
    if (!id || coach?.role !== 'Admin') return
    adminApi.getCoachData(id).then((d) => {
      setData(d)
      const c = d.coach
      setEdit({
        academyName: c.academyName ?? '',
        email: c.email ?? '',
        ownerName: c.name ?? '',
        newPassword: '',
        isActive: c.isActive,
      })
    }).catch(e => setLoadErr(e instanceof Error ? e.message : 'Failed to load'))
  }

  useEffect(() => {
    setLoadErr('')
    load()
  }, [id, coach?.role])

  function workAsThisAcademy() {
    if (!id) return
    localStorage.setItem('actingTenantId', id)
    window.location.href = `/academies/${id}/students`
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!id) return
    setErr('')
    setMsg('')
    setEditBusy(true)
    try {
      await adminApi.updateAcademy(id, {
        academyName: edit.academyName.trim() || undefined,
        email: edit.email.trim() || undefined,
        ownerName: edit.ownerName.trim() || undefined,
        newPassword: edit.newPassword.trim() || undefined,
        isActive: edit.isActive,
      })
      setMsg('Saved.')
      setEdit((s) => ({ ...s, newPassword: '' }))
      load()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed')
    } finally {
      setEditBusy(false)
    }
  }

  async function deactivateAcademy() {
    if (!id || !window.confirm('Deactivate this academy? The owner cannot sign in until reactivated.')) return
    setErr('')
    try {
      await adminApi.deactivateAcademy(id)
      navigate('/admin')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed')
    }
  }

  if (err) return <p className="text-red-600">{err}</p>
  if (!data) return <p>Loading...</p>
  if (coach?.role !== 'Admin') return <p className="text-gray-500">Access denied. Admin only.</p>

  const { coach: coachDetail, students, subscriptions, packages } = data

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate('/admin')} className="text-brand text-sm hover:underline mb-2">← Back to academies</button>
        <h1 className="text-2xl font-semibold">{coachDetail.academyName || coachDetail.name}</h1>
        <p className="text-gray-500">Owner: {coachDetail.name} · {coachDetail.email}</p>
        <p className="text-sm text-gray-400 mt-1">Signed up {new Date(coachDetail.createdAt).toLocaleDateString()} · {coachDetail.isActive ? 'Active' : 'Inactive'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={workAsThisAcademy}
            className="px-4 py-2 rounded-lg btn-brand text-white text-sm hover:opacity-95"
          >
            Manage this academy (Students, Packages, Sessions…)
          </button>
        </div>
      </div>

      {msg && <p className="text-green-700 text-sm mb-4">{msg}</p>}
      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      <div className="bg-white rounded-xl border p-4 mb-8 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">Edit academy / owner</h2>
        <form onSubmit={saveEdit} className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700">Academy name</label>
            <input
              value={edit.academyName}
              onChange={(e) => setEdit((s) => ({ ...s, academyName: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner email</label>
            <input
              type="email"
              value={edit.email}
              onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner display name</label>
            <input
              value={edit.ownerName}
              onChange={(e) => setEdit((s) => ({ ...s, ownerName: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New password (optional)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={edit.newPassword}
              onChange={(e) => setEdit((s) => ({ ...s, newPassword: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Leave blank to keep"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="isActive"
              type="checkbox"
              checked={edit.isActive}
              onChange={(e) => setEdit((s) => ({ ...s, isActive: e.target.checked }))}
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Academy active (owner can sign in)</label>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button type="submit" disabled={editBusy} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {editBusy ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={deactivateAcademy}
              className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm hover:bg-red-50"
            >
              Deactivate academy
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2 border-b mb-4">
        <button
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-t ${tab === 'subscriptions' ? 'bg-white border border-b-0 border-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setTab('students')}
          className={`px-4 py-2 rounded-t ${tab === 'students' ? 'bg-white border border-b-0 border-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setTab('packages')}
          className={`px-4 py-2 rounded-t ${tab === 'packages' ? 'bg-white border border-b-0 border-gray-200 font-medium' : 'hover:bg-gray-100'}`}
        >
          Packages ({packages.length})
        </button>
      </div>

      {tab === 'subscriptions' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <h2 className="px-4 py-3 font-medium border-b bg-gray-50">Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p className="p-6 text-gray-500">No subscriptions.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Student</th>
                      <th className="text-left p-3">Package</th>
                      <th className="text-left p-3">Start</th>
                      <th className="text-left p-3">Expiry</th>
                      <th className="text-left p-3">Remaining</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-3">{s.studentName}</td>
                        <td className="p-3">{s.packageName}</td>
                        <td className="p-3">{new Date(s.startDate).toLocaleDateString()}</td>
                        <td className="p-3">{new Date(s.expiryDate).toLocaleDateString()}</td>
                        <td className="p-3">{s.remainingSessions ?? '—'}</td>
                        <td className="p-3">{s.status}</td>
                        <td className="p-3">{s.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {subscriptions.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{s.studentName}</div>
                        <div className="text-sm text-gray-600 mt-1">{s.packageName}</div>
                      </div>
                      <span
                        className={
                          s.paymentStatus === 'Due'
                            ? 'inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-medium'
                            : 'inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-100 font-medium'
                        }
                      >
                        {s.paymentStatus}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-3 space-y-1">
                      <div>Start: {new Date(s.startDate).toLocaleDateString()}</div>
                      <div>Expiry: {new Date(s.expiryDate).toLocaleDateString()}</div>
                      <div>Remaining: {s.remainingSessions ?? '—'}</div>
                      <div>Status: {s.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <h2 className="px-4 py-3 font-medium border-b bg-gray-50">Students</h2>
          {students.length === 0 ? (
            <p className="p-6 text-gray-500">No students.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Parent</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3">{s.parentName ?? '—'}</td>
                        <td className="p-3">{s.email ?? '—'}</td>
                        <td className="p-3">{s.phone ?? '—'}</td>
                        <td className="p-3">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {students.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-sm text-gray-600 mt-1">Parent: {s.parentName ?? '—'}</div>
                      </div>
                      <span
                        className={
                          s.status === 'Active'
                            ? 'inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-100 font-medium'
                            : s.status === 'Trial'
                              ? 'inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-medium'
                              : 'inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-800 border border-gray-100 font-medium'
                        }
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-3 space-y-1">
                      <div>Email: {s.email ?? '—'}</div>
                      <div>Phone: {s.phone ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'packages' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <h2 className="px-4 py-3 font-medium border-b bg-gray-50">Packages</h2>
          {packages.length === 0 ? (
            <p className="p-6 text-gray-500">No packages.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Price</th>
                      <th className="text-left p-3">Validity (days)</th>
                      <th className="text-left p-3">Sessions</th>
                      <th className="text-left p-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3">${p.price.toFixed(2)}</td>
                        <td className="p-3">{p.validityDays}</td>
                        <td className="p-3">{p.totalSessions ?? 'Unlimited'}</td>
                        <td className="p-3">{p.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {packages.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Price: ${p.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{p.type}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-3 space-y-1">
                      <div>Validity: {p.validityDays} days</div>
                      <div>Sessions: {p.totalSessions ?? 'Unlimited'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
