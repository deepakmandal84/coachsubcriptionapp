import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
  buildMonthGrid,
  isSameLocalDate,
  isSameMonth,
  toLocalDateKey,
} from '../../utils/dateKey'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function AttendanceCalendar({
  attendedDateKeys,
  attendedCounts = {},
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  minMonth,
  joinDate,
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = buildMonthGrid(year, monthIndex)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthLabel = month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  const atJoinMonth = isSameMonth(month, minMonth)
  const atCurrentMonth = isSameMonth(month, today)

  function prevMonth() {
    if (atJoinMonth) return
    onMonthChange(new Date(year, monthIndex - 1, 1))
  }

  function nextMonth() {
    if (atCurrentMonth) return
    onMonthChange(new Date(year, monthIndex + 1, 1))
  }

  return (
    <div className="inline-block max-w-[11.5rem] rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <button
          type="button"
          onClick={prevMonth}
          disabled={atJoinMonth}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Previous month"
        >
          <FiChevronLeft className="text-sm" />
        </button>
        <p className="text-[11px] font-semibold text-slate-800 truncate">{monthLabel}</p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={atCurrentMonth}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next month"
        >
          <FiChevronRight className="text-sm" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center mb-px">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="h-5 w-7 text-[9px] font-medium text-slate-400 leading-5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px" role="grid" aria-label={`Attendance calendar for ${monthLabel}`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="h-7 w-7" aria-hidden />

          const key = toLocalDateKey(date)
          const attended = attendedDateKeys.has(key)
          const count = attendedCounts[key] || 0
          const isToday = isSameLocalDate(date, today)
          const isSelected = selectedDate && isSameLocalDate(date, selectedDate)
          const isFuture = date > today
          const beforeJoin = joinDate && date < joinDate

          if (beforeJoin) {
            return <div key={key} className="h-7 w-7" aria-hidden />
          }

          let cellClass =
            'h-7 w-7 flex items-center justify-center rounded-full text-[10px] font-medium transition relative '
          if (attended) {
            cellClass += 'bg-emerald-500 text-white hover:bg-emerald-600 '
          } else if (isFuture) {
            cellClass += 'text-slate-300 '
          } else {
            cellClass += 'text-slate-600 hover:bg-slate-100 '
          }
          if (isToday && !attended) cellClass += 'ring-1 ring-slate-300 ring-inset '
          if (isSelected) cellClass += ' ring-2 ring-offset-1 ring-slate-800 '

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={!attended}
              onClick={() => attended && onSelectDate?.(isSelected ? null : date)}
              className={cellClass}
              aria-label={
                attended
                  ? `${date.toLocaleDateString()} — ${count} class${count === 1 ? '' : 'es'} attended`
                  : date.toLocaleDateString()
              }
              aria-pressed={isSelected}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <p className="mt-1.5 text-[9px] text-slate-400 text-center">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 align-middle" aria-hidden />
        Green = attended
      </p>
    </div>
  )
}
