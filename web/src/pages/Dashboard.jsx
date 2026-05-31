import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiBarChart2, FiCreditCard, FiUsers } from 'react-icons/fi'
import { reportsApi } from '../api'
import { useAppPaths } from '../hooks/useAppPaths'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import { TableSkeleton } from '../components/ui/Skeleton'
import { formatError } from '../utils/formatError'

function StatCard({ label, value, hint, to }) {
  const inner = (
    <Card className={to ? 'hover:shadow-md transition-shadow h-full' : 'h-full'}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {to && (
        <span className="inline-flex items-center gap-1 text-sm text-brand font-medium mt-3">
          View <FiArrowRight />
        </span>
      )}
    </Card>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function Dashboard() {
  const paths = useAppPaths()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    reportsApi
      .dashboard()
      .then(setData)
      .catch((e) => setErr(formatError(e)))
  }, [paths.academyId])

  if (err) return <Alert variant="error">{err}</Alert>
  if (!data) {
    return (
      <div>
        <PageHeader icon={FiUsers} title="Dashboard" description="Overview of your academy." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse bg-slate-200 rounded-xl" />
          ))}
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    )
  }

  const insightsTo = paths.isAdminManagingAcademy
    ? `${paths.subscriptions}?tab=insights`
    : '/subscriptions?tab=insights'

  return (
    <div>
      <PageHeader
        icon={FiUsers}
        title="Dashboard"
        description="Quick overview of students, subscriptions, and revenue."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Students" value={data.studentCount} to={paths.students || '/students'} />
        <StatCard
          label="Active subscriptions"
          value={data.activeSubscriptionCount}
          to={paths.subscriptions || '/subscriptions'}
        />
        <StatCard
          label="Payments due"
          value={data.paymentsDueCount}
          hint={data.paymentsDueCount > 0 ? 'Needs follow-up' : 'All clear'}
          to={`${paths.subscriptions || '/subscriptions'}${data.paymentsDueCount > 0 ? '?filter=due' : ''}`}
        />
        <StatCard
          label="Revenue this month"
          value={`$${data.monthRevenue.toFixed(2)}`}
          to={insightsTo}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FiBarChart2 className="text-brand" />
              Monthly insights
            </h2>
            <Link to={insightsTo} className="text-sm text-brand font-medium hover:underline">
              Open report
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            See active students and revenue month by month. Useful for tracking growth and seasonality.
          </p>
        </Card>

        <Card padding={false}>
          <h2 className="px-4 py-3 font-semibold text-slate-900 border-b border-slate-100 flex items-center gap-2">
            <FiCreditCard className="text-brand" />
            Expiring soon
          </h2>
          <ul className="divide-y divide-slate-100">
            {data.expiringSoon.length === 0 && (
              <li className="px-4 py-6 text-sm text-slate-500 text-center">Nothing expiring in the next 7 days.</li>
            )}
            {data.expiringSoon.map((x) => (
              <li key={x.subscriptionId} className="px-4 py-3 flex justify-between items-center gap-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {x.studentName} · {x.packageName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Expires {new Date(x.expiryDate).toLocaleDateString()}
                    {x.remainingSessions != null ? ` · ${x.remainingSessions} sessions left` : ''}
                  </p>
                </div>
                {x.remainingSessions != null && x.remainingSessions <= 2 && (
                  <Badge variant="warning">Low</Badge>
                )}
              </li>
            ))}
          </ul>
          {data.expiringSoon.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <Link to={paths.subscriptions || '/subscriptions'} className="text-sm text-brand font-medium">
                Manage subscriptions →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
