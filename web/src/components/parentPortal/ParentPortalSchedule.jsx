import { useMemo, useState } from 'react'
import { FiCheckCircle, FiClock, FiMapPin, FiX } from 'react-icons/fi'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'
import AttendanceCalendar from './AttendanceCalendar'
import { useParentPortal } from '../../context/ParentPortalContext'
import { parentApi } from '../../api'
import { formatSessionDate, formatSessionTime } from '../../utils/sessionFormat'
import { isGroupSessionType, isPersonalTrainingType } from '../../utils/privateSessionForm'
import { isSameLocalDate, parseJoinDate, startOfMonth, toLocalDateKey } from '../../utils/dateKey'

function SessionMeta({ session }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <FiClock className="shrink-0 text-slate-400" aria-hidden />
        {formatSessionDate(session.date, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
        {formatSessionTime(session)}
      </span>
      {session.location && (
        <span className="inline-flex items-center gap-1.5">
          <FiMapPin className="shrink-0 text-slate-400" aria-hidden />
          {session.location}
        </span>
      )}
    </div>
  )
}

function UpcomingGroupSessionCard({ session, primary, bookingId, bookErr, onStartBook, onCancelBook, onConfirmBook }) {
  const confirming = bookingId === session.id
  const booked = session.isBooked

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{session.title}</h3>
          <SessionMeta session={session} />
        </div>
        {booked && !confirming && <Badge variant="info">Signed up</Badge>}
      </div>

      {booked && !confirming ? (
        <p className="mt-3 text-sm text-slate-500">You are on the roster for this group class.</p>
      ) : confirming ? (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          {bookErr && <p className="text-xs text-red-600">{bookErr}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onConfirmBook(session.id)}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: primary }}
            >
              Confirm signup
            </button>
            <button
              type="button"
              onClick={onCancelBook}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onStartBook(session.id)}
          className="mt-3 text-sm font-medium"
          style={{ color: primary }}
        >
          Sign up for this class →
        </button>
      )}
    </article>
  )
}

function UpcomingPtSessionCard({ session }) {
  return (
    <article className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{session.title}</h3>
          <SessionMeta session={session} />
        </div>
        <Badge variant="warning" className="shrink-0">
          Personal training
        </Badge>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Scheduled for you by your coach — not open for self signup.
      </p>
    </article>
  )
}

export default function ParentPortalSchedule() {
  const { token, data, primary, sessions, attendedClasses, scheduleErr, attendedErr, reloadAll } =
    useParentPortal()
  const [bookingId, setBookingId] = useState(null)
  const [bookErr, setBookErr] = useState('')
  const [bookOk, setBookOk] = useState('')
  const joinDate = useMemo(() => parseJoinDate(data.joinedAt || data.createdAt || Date.now()), [data])
  const minMonth = useMemo(() => startOfMonth(joinDate), [joinDate])

  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(null)

  const { attendedDateKeys, attendedCounts } = useMemo(() => {
    const keys = new Set()
    const counts = {}
    for (const s of attendedClasses) {
      const key = toLocalDateKey(s.date)
      keys.add(key)
      counts[key] = (counts[key] || 0) + 1
    }
    return { attendedDateKeys: keys, attendedCounts: counts }
  }, [attendedClasses])

  const filteredAttended = useMemo(() => {
    if (!selectedDate) return attendedClasses
    return attendedClasses.filter((s) => isSameLocalDate(s.date, selectedDate))
  }, [attendedClasses, selectedDate])

  const { upcomingGroup, upcomingPt } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const group = []
    const pt = []
    for (const s of sessions) {
      const sessionDay = new Date(s.date)
      sessionDay.setHours(0, 0, 0, 0)
      if (sessionDay < today) continue
      if (isPersonalTrainingType(s.type)) pt.push(s)
      else if (isGroupSessionType(s.type)) group.push(s)
    }
    return { upcomingGroup: group, upcomingPt: pt }
  }, [sessions])

  async function handleBook(sessionId) {
    if (!token) return
    const session = sessions.find((s) => s.id === sessionId)
    if (session && isPersonalTrainingType(session.type)) {
      setBookErr('Personal training sessions cannot be booked here.')
      return
    }
    setBookErr('')
    setBookOk('')
    try {
      await parentApi.bookSession(token, sessionId, null)
      setBookOk("You're signed up for the group class. Your coach will see your name on the roster.")
      setBookingId(null)
      reloadAll()
    } catch (e) {
      setBookErr(e instanceof Error ? e.message : 'Could not book')
    }
  }

  function startBook(sessionId) {
    setBookingId(sessionId)
    setBookErr('')
    setBookOk('')
  }

  function cancelBook() {
    setBookingId(null)
    setBookErr('')
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Attendance calendar</h2>
          <p className="text-sm text-slate-500 mt-1">
            Green days = classes attended since{' '}
            {joinDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.
            Use arrows to browse months.
          </p>
        </div>

        {attendedErr && <Alert variant="error">{attendedErr}</Alert>}

        <div className="flex justify-center">
          <AttendanceCalendar
            attendedDateKeys={attendedDateKeys}
            attendedCounts={attendedCounts}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            minMonth={minMonth}
            joinDate={joinDate}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedDate
                ? `Classes on ${selectedDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}`
                : 'Classes attended'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {selectedDate
                ? 'Tap a green day again to show all attended classes.'
                : 'Since you joined — tap a green day to filter.'}
            </p>
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 shrink-0"
            >
              <FiX aria-hidden />
              Clear
            </button>
          )}
        </div>

        {filteredAttended.length === 0 && !attendedErr && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
            <p className="text-sm text-slate-600">
              {selectedDate ? 'No attended classes on this day.' : 'No attended classes since you joined.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredAttended.map((s) => (
            <article
              key={`${s.sessionId}-${s.date}`}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <SessionMeta session={s} />
                </div>
                <Badge variant="success" className="shrink-0 inline-flex items-center gap-1">
                  <FiCheckCircle className="text-sm" aria-hidden />
                  Attended
                </Badge>
              </div>
              {s.sessionsConsumed > 1 && (
                <p className="text-xs text-slate-500 mt-2">{s.sessionsConsumed} sessions counted</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-6 pt-2 border-t border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Upcoming classes</h2>
          <p className="text-sm text-slate-500 mt-1">
            Signed in as {data.studentName}. <strong>Group classes</strong> can be booked below.{' '}
            <strong>Personal training</strong> is only shown to you when your coach schedules it.
          </p>
        </div>

        {scheduleErr && <Alert variant="error">{scheduleErr}</Alert>}
        {bookOk && <Alert variant="success">{bookOk}</Alert>}
        {bookErr && bookingId == null && <Alert variant="error">{bookErr}</Alert>}

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Group classes — book a spot</h3>
          {upcomingGroup.length === 0 && !scheduleErr ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
              <p className="text-sm text-slate-600">No upcoming group classes in the next two months.</p>
              <p className="text-xs text-slate-400 mt-1">Check back later or contact your coach.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingGroup.map((s) => (
                <UpcomingGroupSessionCard
                  key={s.id}
                  session={s}
                  primary={primary}
                  bookingId={bookingId}
                  bookErr={bookErr}
                  onStartBook={startBook}
                  onCancelBook={cancelBook}
                  onConfirmBook={handleBook}
                />
              ))}
            </div>
          )}
        </div>

        {upcomingPt.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">Your personal training</h3>
            <p className="text-sm text-slate-500">These sessions are private to you and assigned by your coach.</p>
            <div className="space-y-3">
              {upcomingPt.map((s) => (
                <UpcomingPtSessionCard key={s.id} session={s} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
