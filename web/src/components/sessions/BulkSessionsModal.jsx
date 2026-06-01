import { useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Input from '../ui/Input'
import SessionPickerCalendar from './SessionPickerCalendar'
import { toLocalDateKey } from '../../utils/dateKey'
import { sessionsApi } from '../../api'

const emptyForm = (coachIds) => ({
  startTime: '09:00',
  type: 'Group',
  title: '',
  location: '',
  coachIds,
})

export default function BulkSessionsModal({ open, onClose, team, canManageSessions, coachId, existingSessions, onCreated }) {
  const ownerId = coachId ? String(coachId) : ''
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [form, setForm] = useState(() => emptyForm(ownerId ? [ownerId] : []))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const existingDateKeys = useMemo(() => {
    const keys = new Set()
    for (const s of existingSessions || []) {
      keys.add(toLocalDateKey(s.date))
    }
    return keys
  }, [existingSessions])

  const sortedSelected = useMemo(() => [...selectedKeys].sort(), [selectedKeys])

  function toggleDate(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectWeekdaysInMonth() {
    const year = calendarMonth.getFullYear()
    const monthIndex = calendarMonth.getMonth()
    const last = new Date(year, monthIndex + 1, 0).getDate()
    const next = new Set(selectedKeys)
    for (let day = 1; day <= last; day++) {
      const d = new Date(year, monthIndex, day)
      const dow = d.getDay()
      if (dow >= 1 && dow <= 5) next.add(toLocalDateKey(d))
    }
    setSelectedKeys(next)
  }

  function toggleCoachId(id) {
    const sid = String(id)
    setForm((f) => {
      const set = new Set((f.coachIds || []).map(String))
      if (set.has(sid)) set.delete(sid)
      else set.add(sid)
      return { ...f, coachIds: [...set] }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (selectedKeys.size === 0) {
      setErr('Select at least one day on the calendar.')
      return
    }
    if (!form.title.trim()) {
      setErr('Title is required.')
      return
    }
    if (canManageSessions && (!form.coachIds || form.coachIds.length === 0)) {
      setErr('Select at least one coach.')
      return
    }
    if (selectedKeys.size > 62) {
      setErr('Select at most 62 days at once.')
      return
    }

    setBusy(true)
    try {
      const result = await sessionsApi.createBulk({
        dates: sortedSelected,
        startTime: form.startTime,
        type: form.type,
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        coachIds: canManageSessions ? form.coachIds : undefined,
      })
      onCreated?.(result.createdCount)
      setSelectedKeys(new Set())
      setForm(emptyForm(ownerId ? [ownerId] : []))
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not create sessions')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      title="Bulk add sessions"
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="bulk-sessions-form" disabled={busy}>
            {busy ? 'Creating…' : `Create ${selectedKeys.size || ''} session${selectedKeys.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      }
    >
      <form id="bulk-sessions-form" onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-600">
          Pick multiple days on the calendar. The same time, title, type, location, and coaches apply to every selected day.
        </p>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:flex-1 space-y-2">
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              <Button type="button" variant="secondary" size="sm" onClick={selectWeekdaysInMonth}>
                Weekdays this month
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedKeys(new Set())}>
                Clear selection
              </Button>
            </div>
            <SessionPickerCalendar
              selectedDateKeys={selectedKeys}
              onToggleDate={(key) => toggleDate(key)}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              existingSessionDateKeys={existingDateKeys}
            />
            <p className="text-center lg:text-left text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{selectedKeys.size}</span> day
              {selectedKeys.size === 1 ? '' : 's'} selected
            </p>
          </div>

          <div className="lg:w-72 space-y-3 shrink-0">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Time *"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                required
              />
              <Select
                label="Type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="Group">Group</option>
                <option value="Private">Private</option>
              </Select>
            </div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            {canManageSessions && team.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Coaches *</p>
                <div className="border border-slate-200 rounded-lg divide-y max-h-36 overflow-y-auto">
                  {team.map((m) => {
                    const checked = (form.coachIds || []).map(String).includes(String(m.id))
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm"
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleCoachId(m.id)} />
                        <span className="font-medium">{m.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {sortedSelected.length > 0 && sortedSelected.length <= 8 && (
          <p className="text-xs text-slate-500">
            Dates:{' '}
            {sortedSelected
              .map((k) => {
                const [y, mo, d] = k.split('-').map(Number)
                return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              })
              .join(', ')}
          </p>
        )}
      </form>
    </Modal>
  )
}
