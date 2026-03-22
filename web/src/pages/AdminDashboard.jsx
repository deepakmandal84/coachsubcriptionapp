import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { adminApi } from '../api'

export default function AdminDashboard() {
  const { coach } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [onboard, setOnboard] = useState({ academyName: '', email: '', password: '', ownerName: '' })
  const [onboardBusy, setOnboardBusy] = useState(false)

  function reload() {
    adminApi.dashboard().then(setData).catch(e => setErr(e instanceof Error ? e.message : 'Failed to load'))
  }

  useEffect(() => {
    if (coach?.role !== 'Admin') return
    reload()
  }, [coach?.role])

  async function submitOnboard(e) {
    e.preventDefault()
    setErr('')
    setMsg('')
    setOnboardBusy(true)
    try {
      const row = await adminApi.onboardAcademy({
        academyName: onboard.academyName.trim(),
        email: onboard.email.trim(),
        password: onboard.password,
        ownerName: onboard.ownerName.trim() || undefined,
      })
      setMsg(`Academy created. Share login with owner: ${row.email} / (password you set).`)
      setOnboard({ academyName: '', email: '', password: '', ownerName: '' })
      reload()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Failed')
    } finally {
      setOnboardBusy(false)
    }
  }

  if (err) return <p className="text-red-600">{err}</p>
  if (!data) return <p>Loading...</p>
  if (coach?.role !== 'Admin') return <p className="text-gray-500">Access denied. Admin only.</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Super Admin</h1>
      <p className="text-gray-500 mb-6">Onboard academies and manage clubs. Use <strong>Manage academy</strong> in the header to open Students, Packages, and Sessions for a selected club.</p>

      <div className="bg-white rounded-xl border p-4 mb-8 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">Onboard new academy</h2>
        <p className="text-sm text-gray-500 mb-4">Creates the owner account. Share the email and password with the academy owner.</p>
        <form onSubmit={submitOnboard} className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Academy name *</label>
            <input
              required
              value={onboard.academyName}
              onChange={(e) => setOnboard((o) => ({ ...o, academyName: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="e.g. North Shore Tennis"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner email *</label>
            <input
              required
              type="email"
              value={onboard.email}
              onChange={(e) => setOnboard((o) => ({ ...o, email: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner password *</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={onboard.password}
              onChange={(e) => setOnboard((o) => ({ ...o, password: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Owner display name (optional)</label>
            <input
              value={onboard.ownerName}
              onChange={(e) => setOnboard((o) => ({ ...o, ownerName: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Defaults to academy name"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={onboardBusy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {onboardBusy ? 'Creating…' : 'Create academy'}
            </button>
          </div>
        </form>
      </div>

      {msg && <p className="text-green-700 mb-4 text-sm">{msg}</p>}

      <div className="mb-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Total coaches: {data.totalCoaches}</span>
      </div>
      <div className="space-y-3">
        <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Coach / Academy</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Signed up</th>
                <th className="text-right p-3">Students</th>
                <th className="text-right p-3">Active subs</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.coaches.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <span className="font-medium">{c.name}</span>
                    {c.academyName && <span className="text-gray-500 block text-sm">{c.academyName}</span>}
                  </td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">{c.studentCount}</td>
                  <td className="p-3 text-right">{c.activeSubscriptionCount}</td>
                  <td className="p-3">
                    <span className={c.isActive ? 'text-green-600' : 'text-red-600'}>{c.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="p-3">
                    <Link to={`/admin/coaches/${c.id}`} className="text-blue-600 hover:underline">View data</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.coaches.length === 0 && (
            <p className="p-6 text-gray-500 text-center">No coaches yet.</p>
          )}
        </div>

        <div className="md:hidden space-y-3">
          {data.coaches.length === 0 ? (
            <div className="bg-white rounded-2xl border p-4 text-center text-gray-500">
              No coaches yet.
            </div>
          ) : (
            data.coaches.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    {c.academyName && <div className="text-sm text-gray-500 mt-1">{c.academyName}</div>}
                    <div className="text-sm text-gray-600 mt-1">{c.email}</div>
                  </div>
                  <div className="text-sm">
                    <span
                      className={
                        c.isActive
                          ? 'inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-100'
                          : 'inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-800 border border-red-100'
                      }
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-3 space-y-1">
                  <div>Signed up: {new Date(c.createdAt).toLocaleDateString()}</div>
                  <div>Students: {c.studentCount}</div>
                  <div>Active subs: {c.activeSubscriptionCount}</div>
                </div>
                <div className="pt-3">
                  <Link to={`/admin/coaches/${c.id}`} className="inline-flex w-full justify-center px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                    View data
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
