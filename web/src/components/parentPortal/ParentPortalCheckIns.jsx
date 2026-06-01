import { useMemo } from 'react'
import { useParentProgress } from '../../context/ParentProgressContext'
import { useParentPortal } from '../../context/ParentPortalContext'
import CheckInFormModal from './CheckInFormModal'
import Button from '../ui/Button'
import { FiPlus } from 'react-icons/fi'
import { formatLength, formatWeight } from '../../utils/progressUnits'
import { formatCheckInDate, weekNumberForCheckIn } from '../../utils/progressStats'
import { bodyFatMethodLabel } from '../../utils/bodyFatCalc'
import { useToast } from '../../context/ToastContext'

const MEASURE_ROWS = [
  [
    { key: 'waist', label: 'Waist' },
    { key: 'hips', label: 'Hips' },
    { key: 'chest', label: 'Chest' },
  ],
  [
    { key: 'bodyFat', label: 'Body fat', isBf: true },
    { key: 'neck', label: 'Neck' },
    { key: 'weight', label: 'Weight', isWeight: true },
  ],
]

function CheckInCard({ entry, week, unit, primary }) {
  const m = entry.measurements || {}

  function cellValue(key, isBf, isWeight) {
    if (isWeight) return formatWeight(entry.weight, unit)
    if (isBf) return entry.bodyFatPercent != null ? `${entry.bodyFatPercent}%` : '—'
    return formatLength(m[key], unit)
  }

  return (
    <article className="relative pl-8 pb-8 last:pb-0">
      <span
        className="absolute left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: primary }}
        aria-hidden
      />
      <div className="absolute left-[12px] top-5 bottom-0 w-px bg-slate-200 last:hidden" aria-hidden />

      <header className="mb-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-semibold text-slate-900">Week {week}</h3>
          <time className="text-sm text-slate-500" dateTime={entry.recordedOn}>
            {formatCheckInDate(entry.recordedOn)}
          </time>
        </div>
        {entry.bodyFatMethod && (
          <p className="text-xs text-slate-400 mt-0.5">{bodyFatMethodLabel(entry.bodyFatMethod)}</p>
        )}
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {MEASURE_ROWS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 divide-x divide-slate-100">
              {row.map(({ key, label, isBf, isWeight }) => (
                <div key={key} className="px-3 py-3 text-center min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 truncate">{label}</p>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
                    {cellValue(key, isBf, isWeight)}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
        {entry.notes && (
          <p className="text-xs text-slate-600 px-3 py-2 bg-slate-50 border-t border-slate-100">{entry.notes}</p>
        )}
      </div>
    </article>
  )
}

export default function ParentPortalCheckIns() {
  const { primary } = useParentPortal()
  const toast = useToast()
  const { token, entries, unit, profile, loading, openCheckIn, checkInOpen, closeCheckIn, reload } = useParentProgress()

  const { sorted, firstDate } = useMemo(() => {
    const asc = [...entries].sort((a, b) => new Date(a.recordedOn) - new Date(b.recordedOn))
    return { sorted: [...entries].sort((a, b) => new Date(b.recordedOn) - new Date(a.recordedOn)), firstDate: asc[0]?.recordedOn }
  }, [entries])

  if (loading && entries.length === 0) {
    return <p className="text-slate-500 text-center py-8 animate-pulse">Loading check-ins…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Check-ins</h2>
          <p className="text-sm text-slate-500">Your measurement history</p>
        </div>
        <Button size="sm" onClick={openCheckIn}>
          <FiPlus />
          Add
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-600">No check-ins yet.</p>
          <Button className="mt-4" onClick={openCheckIn}>
            <FiPlus />
            Log first check-in
          </Button>
        </div>
      ) : (
        <div className="relative">
          {sorted.map((entry) => (
            <CheckInCard
              key={entry.id}
              entry={entry}
              week={weekNumberForCheckIn(entry.recordedOn, firstDate)}
              unit={unit}
              primary={primary}
            />
          ))}
        </div>
      )}

      <CheckInFormModal
        open={checkInOpen}
        onClose={closeCheckIn}
        token={token}
        unit={unit}
        profile={profile}
        onSaved={() => {
          toast.success('Check-in saved')
          reload()
        }}
      />
    </div>
  )
}
