import Card from '../ui/Card'

export default function StudentSessionMatrix({ data, loading }) {
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
                  {(row.sessionCounts ?? []).map((count, i) => (
                    <td
                      key={`${row.studentId}-${months[i]?.year}-${months[i]?.month}`}
                      className={`p-3 text-center tabular-nums ${count > 0 ? 'text-slate-900 font-medium' : 'text-slate-300'}`}
                    >
                      {count > 0 ? count : '—'}
                    </td>
                  ))}
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
        Counts are sessions marked present in attendance (sessions consumed) per calendar month.
      </p>
    </Card>
  )
}
