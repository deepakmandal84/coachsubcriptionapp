import { useEffect, useMemo, useState } from 'react'
import { parentApi } from '../../api'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import {
  BODY_FAT_MEASUREMENT_FIELDS,
  OTHER_MEASUREMENT_FIELDS,
  emptyMeasurements,
  lengthLabel,
  measurementsToPayload,
  weightLabel,
} from '../../utils/progressUnits'
import { bodyFatMethodLabel, previewBodyFat } from '../../utils/bodyFatCalc'
import { formatError } from '../../utils/formatError'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function CheckInFormModal({ open, onClose, token, unit, profile, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    recordedOn: todayIso(),
    weight: '',
    bodyFatPercent: '',
    notes: '',
    measurements: emptyMeasurements(),
  })

  const profileForm = useMemo(
    () => ({
      gender: profile?.gender || 'Unspecified',
      height: profile?.height != null ? String(profile.height) : '',
      dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    }),
    [profile]
  )

  useEffect(() => {
    if (open) {
      setForm({
        recordedOn: todayIso(),
        weight: '',
        bodyFatPercent: '',
        notes: '',
        measurements: emptyMeasurements(),
      })
      setErr('')
    }
  }, [open])

  const autoBodyFat = useMemo(
    () =>
      previewBodyFat({
        gender: profileForm.gender,
        height: profileForm.height,
        dateOfBirth: profileForm.dateOfBirth,
        unit,
        weight: form.weight,
        measurements: form.measurements,
      }),
    [profileForm, unit, form.weight, form.measurements]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const body = {
      recordedOn: form.recordedOn,
      weight: form.weight === '' ? null : Number(form.weight),
      bodyFatPercent: form.bodyFatPercent === '' ? null : Number(form.bodyFatPercent),
      measurements: measurementsToPayload(form.measurements),
      notes: form.notes || null,
    }
    try {
      await parentApi.createProgress(token, body)
      onSaved?.()
      onClose()
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      title="Log check-in"
      onClose={onClose}
      wide
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="parent-checkin-form" disabled={busy}>
            {busy ? 'Saving…' : 'Save check-in'}
          </Button>
        </div>
      }
    >
      <form id="parent-checkin-form" onSubmit={handleSubmit} className="space-y-3">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Input
          label="Date *"
          type="date"
          value={form.recordedOn}
          onChange={(e) => setForm((f) => ({ ...f, recordedOn: e.target.value }))}
          required
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label={weightLabel(unit)}
            type="number"
            step="0.1"
            min="0"
            value={form.weight}
            onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
            required
          />
          <div>
            <Input
              label="Body fat % (optional)"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.bodyFatPercent}
              onChange={(e) => setForm((f) => ({ ...f, bodyFatPercent: e.target.value }))}
              placeholder={autoBodyFat.percent != null ? `Auto: ${autoBodyFat.percent}%` : 'Auto when possible'}
            />
            {form.bodyFatPercent === '' && autoBodyFat.percent != null && (
              <p className="text-xs text-brand mt-1">
                Estimated {autoBodyFat.percent}% ({bodyFatMethodLabel(autoBodyFat.method)})
              </p>
            )}
          </div>
        </div>
        <p className="text-sm font-medium text-slate-700">Measurements ({lengthLabel(unit)})</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BODY_FAT_MEASUREMENT_FIELDS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              step="0.1"
              min="0"
              value={form.measurements[key]}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  measurements: { ...f.measurements, [key]: e.target.value },
                }))
              }
            />
          ))}
          {OTHER_MEASUREMENT_FIELDS.map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              step="0.1"
              min="0"
              value={form.measurements[key]}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  measurements: { ...f.measurements, [key]: e.target.value },
                }))
              }
            />
          ))}
        </div>
        <Input label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </form>
    </Modal>
  )
}
