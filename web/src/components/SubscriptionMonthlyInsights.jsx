import { useEffect, useMemo, useState } from 'react'
import { reportsApi } from '../api'
import { FiBarChart2 } from 'react-icons/fi'
import Card from './ui/Card'
import Alert from './ui/Alert'
import Select from './ui/Select'
import { TableSkeleton } from './ui/Skeleton'
import { formatError } from '../utils/formatError'

function maxOf(rows, key) {
  return Math.max(1, ...rows.map((r) => r[key] ?? 0))
}

export default function SubscriptionMonthlyInsights() {
  const [months, setMonths] = useState(12)
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setErr('')
    reportsApi
      .monthly(months)
      .then(setData)
      .catch((e) => setErr(formatError(e, 'Failed to load monthly report')))
  }, [months])

  const rows = data?.months ?? []
  const maxStudents = useMemo(() => maxOf(rows, 'activeStudentCount'), [rows])
  const maxRevenue = useMemo(() => maxOf(rows, 'revenue'), [rows])
  const totalRevenue = useMemo(() => rows.reduce((s, r) => s + (r.revenue ?? 0), 0), [rows])

  if (err) return <Alert variant="error">{err}</Alert>
  if (!data) return <TableSkeleton rows={5} cols={4} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Students with at least one non-cancelled subscription overlapping each month. Revenue is payments recorded that month.
        </p>
        <Select label="Range" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-40">
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total revenue ({months} mo)</p>
          <p className="text-2xl font-semibold tabular-nums">${totalRevenue.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Latest month active students</p>
          <p className="text-2xl font-semibold tabular-nums">
            {rows.length ? rows[rows.length - 1].activeStudentCount : 0}
          </p>
          {rows.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">{rows[rows.length - 1].label}</p>
          )}
        </Card>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <FiBarChart2 className="text-brand" />
            Active students by month
          </h3>
          <div className="flex items-end gap-1 h-36">
            {rows.map((r) => (
              <div key={`${r.year}-${r.month}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-teal-600 rounded-t min-h-[4px]"
                  style={{ height: `${(r.activeStudentCount / maxStudents) * 100}%` }}
                  title={`${r.activeStudentCount} students`}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{r.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
            <FiBarChart2 className="text-emerald-600" />
            Revenue by month
          </h3>
          <div className="flex items-end gap-1 h-36">
            {rows.map((r) => (
              <div key={`${r.year}-${r.month}-rev`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-emerald-500 rounded-t min-h-[4px]"
                  style={{ height: `${(r.revenue / maxRevenue) * 100}%` }}
                  title={`$${r.revenue.toFixed(2)}`}
                />
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{r.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding={false} className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-600">Month</th>
              <th className="text-right p-3 font-medium text-slate-600">Active students</th>
              <th className="text-right p-3 font-medium text-slate-600">Active subs</th>
              <th className="text-right p-3 font-medium text-slate-600">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  No data for this period.
                </td>
              </tr>
            )}
            {[...rows].reverse().map((r) => (
              <tr key={`${r.year}-${r.month}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                <td className="p-3 font-medium text-slate-900">{r.label}</td>
                <td className="p-3 text-right tabular-nums">{r.activeStudentCount}</td>
                <td className="p-3 text-right tabular-nums text-slate-600">{r.activeSubscriptionCount}</td>
                <td className="p-3 text-right tabular-nums font-medium">${r.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
