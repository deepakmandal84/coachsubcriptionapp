import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    reportsApi.dashboard().then(setData).catch(e => setErr(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  if (err) return <p className="text-red-600">{err}</p>
  if (!data) return <p>Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Students</p>
          <p className="text-2xl font-semibold">{data.studentCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Active subscriptions</p>
          <p className="text-2xl font-semibold">{data.activeSubscriptionCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Payments due</p>
          <p className="text-2xl font-semibold">{data.paymentsDueCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Revenue this month</p>
          <p className="text-2xl font-semibold">${data.monthRevenue.toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border">
        <h2 className="px-4 py-3 font-medium border-b">Expiring soon</h2>
        <ul className="divide-y">
          {data.expiringSoon.length === 0 && <li className="px-4 py-3 text-gray-500">None</li>}
          {data.expiringSoon.map(x => (
            <li key={x.subscriptionId} className="px-4 py-3 flex justify-between items-center">
              <span>{x.studentName} – {x.packageName}</span>
              <span className="text-gray-500">Expires {new Date(x.expiryDate).toLocaleDateString()}{x.remainingSessions != null ? ` · ${x.remainingSessions} left` : ''}</span>
              <Link to="/subscriptions" className="text-blue-600 text-sm hover:underline">View</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
