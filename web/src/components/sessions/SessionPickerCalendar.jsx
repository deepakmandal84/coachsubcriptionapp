import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { buildMonthGrid, isSameLocalDate, isSameMonth, toLocalDateKey } from '../../utils/dateKey'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SessionPickerCalendar({
  selectedDateKeys,
  onToggleDate,
  month,
  onMonthChange,
  existingSessionDateKeys = new Set(),
  allowPast = true,
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = buildMonthGrid(year, monthIndex)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  function prevMonth() {
    onMonthChange(new Date(year, monthIndex - 1, 1))
  }

  function nextMonth() {
    onMonthChange(new Date(year, monthIndex + 1, 1))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Previous month"
        >
          <FiChevronLeft />
        </button>
        <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Next month"
        >
          <FiChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[10px] font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Pick session dates for ${monthLabel}`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="aspect-square" aria-hidden />

          const key = toLocalDateKey(date)
          const selected = selectedDateKeys.has(key)
          const hasSession = existingSessionDateKeys.has(key)
          const isToday = isSameLocalDate(date, today)
          const isPast = date < today
          const disabled = !allowPast && isPast

          let cellClass =
            'aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition '
          if (disabled) {
            cellClass += 'text-slate-300 cursor-not-allowed '
          } else if (selected) {
            cellClass += 'btn-brand text-white shadow-sm hover:opacity-90 '
          } else {
            cellClass += 'text-slate-700 hover:bg-slate-100 '
            if (isPast) cellClass += 'text-slate-400 '
          }
          if (isToday && !selected) cellClass += 'ring-1 ring-brand ring-inset '
          if (hasSession && !selected) cellClass += 'font-semibold '

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={disabled}
              onClick={() => !disabled && onToggleDate(key, date)}
              className={cellClass}
              aria-label={date.toLocaleDateString()}
              aria-pressed={selected}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 justify-center text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded btn-brand" aria-hidden />
          Selected
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-slate-300 font-bold text-[8px] leading-3 text-center">
            ·
          </span>
          Already scheduled
        </span>
      </div>
    </div>
  )
}
