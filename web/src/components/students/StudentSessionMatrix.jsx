import { useEffect, useMemo, useState } from 'react'
import { studentsApi } from '../../api'
import { formatApiDateDisplay } from '../../utils/dateKey'
import { formatError } from '../../utils/formatError'
import Card from '../ui/Card'
import Modal from '../ui/Modal'

function groupEntriesByDate(entries) {
  const map = new Map()
  for (const e of entries ?? []) {
    const key = e.date
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(e)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function StudentSessionMatrix({ data, loading }) {
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      setDetailErr('')
      return
    }

    let cancelled = false
    setDetailLoading(true)
    setDetailErr('')
    studentsApi
      .sessionMatrixMonth(selected.studentId, { year: selected.year, month: selected.month })
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((e) => {
        if (!cancelled) setDetailErr(formatError(e))
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  const dayGroups = useMemo(() => groupEntriesByDate(detail?.entries), [detail?.entries])
  const uniqueDays = dayGroups.length

  function openCell(row, month, count) {
    if (!count || count <= 0 || !month) return
    setSelected({
      studentId: row.studentId,
      studentName: row.studentName,
      year: month.year,
      month: month.month,
      label: month.label,
      count,
    })
  }

  function closePopup() {
    setSelected(null)
  }

  if (loading && !data) {
    return <p className="text-slate-500 text-sm animate-pulse py-8 text-center">Loading session counts…</p>
  }

  const months = data?.months ?? []
  const rows = data?.rows ?? []

  if (months.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-slate-600">
        No month columns yet. Columns appear from June through the current month.
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-slate-600">
        No active students match your search.
      </Card>
    )
  }

  return (
    <>
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 min-w-[10rem]">
                  Student
                </th>
                {months.map((m) => (
                  <th
                    key={`${m.year}-${m.month}`}
                    className="p-3 font-medium text-slate-600 text-center whitespace-nowrap min-w-[4.5rem]"
                  >
                    {m.label}
                  </th>
                ))}
                <th className="p-3 font-medium text-slate-600 text-center bg-slate-100/80 whitespace-nowrap">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = (row.sessionCounts ?? []).reduce((a, b) => a + b, 0)
                return (
                  <tr key={row.studentId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900 sticky left-0 z-[1] bg-white border-r border-slate-100">
                      {row.studentName}
                    </td>
                    {(row.sessionCounts ?? []).map((count, i) => {
                      const month = months[i]
                      const clickable = count > 0
                      return (
                        <td
                          key={`${row.studentId}-${month?.year}-${month?.month}`}
                          className={`p-3 text-center tabular-nums ${
                            clickable
                              ? 'text-brand font-medium cursor-pointer hover:bg-slate-100 underline decoration-brand/40 underline-offset-2'
                              : 'text-slate-300'
                          }`}
                          onClick={clickable ? () => openCell(row, month, count) : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    openCell(row, month, count)
                                  }
                                }
                              : undefined
                          }
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          title={clickable ? 'View days attended this month' : undefined}
                        >
                          {count > 0 ? count : '—'}
                        </td>
                      )
                    })}
                    <td className="p-3 text-center tabular-nums font-semibold text-slate-900 bg-slate-50/80">
                      {total > 0 ? total : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-100">
          Counts are sessions marked present in attendance (sessions consumed) per calendar month. Click a number to see
          which days they attended.
        </p>
      </Card>

      {selected && (
        <Modal
          title={`${selected.studentName} — ${selected.label}`}
          onClose={closePopup}
        >
          {detailLoading && (
            <p className="text-sm text-slate-500 animate-pulse py-4 text-center">Loading attendance…</p>
          )}
          {detailErr && !detailLoading && (
            <p className="text-sm text-red-600 py-2">{detailErr}</p>
          )}
          {!detailLoading && !detailErr && detail && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{uniqueDays}</span> day{uniqueDays === 1 ? '' : 's'}{' '}
                attended · <span className="font-medium text-slate-900">{detail.totalSessions}</span> session
                {detail.totalSessions === 1 ? '' : 's'} total
              </p>
              {dayGroups.length === 0 ? (
                <p className="text-sm text-slate-500">No attendance records for this month.</p>
              ) : (
                <ul className="space-y-3 max-h-[min(50vh,20rem)] overflow-y-auto pr-1">
                  {dayGroups.map(([dateKey, sessions]) => (
                    <li key={dateKey} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatApiDateDisplay(dateKey, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {sessions.map((s, idx) => (
                          <li key={`${dateKey}-${idx}`} className="text-xs text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>{s.title}</span>
                            {s.time && <span className="text-slate-400">{s.time}</span>}
                            {s.sessionsConsumed > 1 && (
                              <span className="text-slate-500">({s.sessionsConsumed} sessions)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
