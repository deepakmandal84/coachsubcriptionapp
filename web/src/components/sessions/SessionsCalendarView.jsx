import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock, FiUsers } from 'react-icons/fi'
import {
  buildMonthGrid,
  isSameLocalDate,
  parseLocalDateKey,
  toLocalDateKey,
} from '../../utils/dateKey'
import { formatSessionTime } from '../../utils/sessionFormat'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function sessionTypeLabel(type) {
  return type === 'Private' ? 'PT' : 'Group'
}

function sessionTimeKey(s) {
  return `${toLocalDateKey(s.date)}T${(s.startTime || '00:00').slice(0, 5)}`
}

export default function SessionsCalendarView({
  sessions,
  month,
  onMonthChange,
  selectedDateKey,
  onSelectDate,
  sessionTypeLabelFn = sessionTypeLabel,
  paths,
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const cells = buildMonthGrid(year, monthIndex)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const sessionsByDate = useMemo(() => {
    const map = new Map()
    for (const s of sessions || []) {
      const key = toLocalDateKey(s.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => sessionTimeKey(a).localeCompare(sessionTimeKey(b)))
    }
    return map
  }, [sessions])

  const selectedSessions = selectedDateKey ? sessionsByDate.get(selectedDateKey) ?? [] : []
  const selectedLabel = selectedDateKey
    ? parseLocalDateKey(selectedDateKey).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null

  function prevMonth() {
    onMonthChange(new Date(year, monthIndex - 1, 1))
  }

  function nextMonth() {
    onMonthChange(new Date(year, monthIndex + 1, 1))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[22rem] shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
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

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Sessions calendar for ${monthLabel}`}>
            {cells.map((date, i) => {
              if (!date) return <div key={`pad-${i}`} className="aspect-square" aria-hidden />

              const key = toLocalDateKey(date)
              const daySessions = sessionsByDate.get(key) ?? []
              const selected = selectedDateKey === key
              const isToday = isSameLocalDate(date, today)
              const count = daySessions.length

              let cellClass =
                'aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition relative '
              if (selected) {
                cellClass += 'btn-brand text-white shadow-sm '
              } else if (count > 0) {
                cellClass += 'bg-brand-subtle text-brand hover:bg-brand-subtle/80 '
              } else {
                cellClass += 'text-slate-700 hover:bg-slate-100 '
              }
              if (isToday && !selected) cellClass += 'ring-1 ring-brand ring-inset '

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  onClick={() => onSelectDate(key)}
                  className={cellClass}
                  aria-label={`${date.toLocaleDateString()}${count ? `, ${count} session${count === 1 ? '' : 's'}` : ''}`}
                  aria-pressed={selected}
                >
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <span
                      className={`text-[9px] font-semibold mt-0.5 ${selected ? 'text-white/90' : 'text-brand'}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-[10px] text-slate-500 text-center">
            Highlighted days have sessions. Click a day for details.
          </p>
        </div>

        <div className="flex-1 min-w-0">
          {!selectedDateKey ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
              Select a day on the calendar to see sessions and who is booked.
            </div>
          ) : selectedSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
              No sessions on {selectedLabel}.
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">{selectedLabel}</h2>
              {selectedSessions.map((s) => {
                const names = s.bookedStudentNames ?? []
                const completed = (s.attendanceCount ?? 0) > 0
                return (
                  <article
                    key={s.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">{s.title}</h3>
                        <p className="text-sm text-slate-600 mt-1 inline-flex items-center gap-1.5">
                          <FiClock className="shrink-0" aria-hidden />
                          {formatSessionTime(s)}
                          <span className="text-slate-300">·</span>
                          {sessionTypeLabelFn(s.type)}
                          {s.location ? (
                            <>
                              <span className="text-slate-300">·</span>
                              {s.location}
                            </>
                          ) : null}
                        </p>
                      </div>
                      {completed && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-1">
                          <FiCheckCircle aria-hidden />
                          {s.attendedCount ?? 0} attended
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 inline-flex items-center gap-1">
                        <FiUsers className="shrink-0" aria-hidden />
                        Booked ({names.length || s.bookingCount || 0})
                      </p>
                      {names.length > 0 ? (
                        <ul className="text-sm text-slate-800 flex flex-wrap gap-x-3 gap-y-1">
                          {names.map((name) => (
                            <li key={`${s.id}-${name}`}>• {name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">No one booked yet</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <Link
                        to={paths.sessionAttendance(s.id)}
                        className="text-sm font-medium text-brand hover:underline inline-flex items-center gap-1"
                      >
                        <FiCheckCircle aria-hidden />
                        Attendance
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
