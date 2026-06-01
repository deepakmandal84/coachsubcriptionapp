import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiActivity, FiPlus, FiTrash2, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { progressApi, parentApi } from '../api'
import Card from './ui/Card'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import Modal from './ui/Modal'
import Alert from './ui/Alert'
import ConfirmDialog from './ConfirmDialog'
import ProgressLineChart from './ProgressLineChart'
import { useToast } from '../context/ToastContext'
import { formatError } from '../utils/formatError'
import {
  BODY_FAT_MEASUREMENT_FIELDS,
  OTHER_MEASUREMENT_FIELDS,
  emptyMeasurements,
  formatDelta,
  formatWeight,
  formatLength,
  heightLabel,
  lengthLabel,
  measurementsToPayload,
  weightLabel,
} from '../utils/progressUnits'
import { bodyFatMethodLabel, previewBodyFat } from '../utils/bodyFatCalc'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    recordedOn: todayIso(),
    weight: '',
    bodyFatPercent: '',
    notes: '',
    measurements: emptyMeasurements(),
  }
}

function ageFromDateOfBirth(iso) {
  if (!iso) return null
  const dob = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

function ProfileReadOnlyField({ label, value, hint, className = '' }) {
  return (
    <div className={className}>
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <div className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800 tabular-nums">
        {value}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function DeltaCard({ label, value, delta, unit, type }) {
  const trend =
    delta == null ? null : delta < 0 ? (
      <FiTrendingDown className="text-emerald-600 shrink-0" />
    ) : delta > 0 ? (
      <FiTrendingUp className="text-amber-600 shrink-0" />
    ) : null
  return (
    <Card>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
      {delta != null && (
        <p className="text-xs text-slate-600 mt-1 inline-flex items-center gap-1">
          {trend}
          Since last: {formatDelta(delta, unit, type) ?? '—'}
        </p>
      )}
    </Card>
  )
}

export default function ProgressTracker({ mode, studentId, token, studentName, onBack, embedded = false }) {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [profileForm, setProfileForm] = useState({ gender: 'Unspecified', height: '', dateOfBirth: '' })
  const [profileBusy, setProfileBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setErr('')
    const p =
      mode === 'parent'
        ? parentApi.getProgress(token, 12)
        : progressApi.getSummary(studentId, 12)
    p.then(setSummary)
      .catch((e) => setErr(formatError(e)))
      .finally(() => setLoading(false))
  }, [mode, studentId, token])

  useEffect(() => {
    load()
  }, [load])

  const profile = summary?.profile
  const unit = profile?.measurementUnit || 'Imperial'
  const displayName = studentName || summary?.studentName || 'Client'
  const chart = summary?.chart
  const delta = summary?.latestDelta
  const entries = summary?.entries || []
  const displayAge = ageFromDateOfBirth(profileForm.dateOfBirth) ?? profile?.ageYears ?? null
  const navyFields = profile?.bodyFatRequiredFields?.length
    ? profile.bodyFatRequiredFields.join(', ')
    : 'Gender, Height, Neck, Waist' + (profileForm.gender === 'Female' ? ', Hips' : '')

  useEffect(() => {
    if (!profile) return
    setProfileForm({
      gender: profile.gender || 'Unspecified',
      height: profile.height != null ? String(profile.height) : '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    })
  }, [profile])

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

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileBusy(true)
    try {
      const body = {
        gender: profileForm.gender,
        height: profileForm.height === '' ? null : Number(profileForm.height),
        dateOfBirth: profileForm.dateOfBirth || null,
      }
      if (mode === 'parent') await parentApi.updateProfile(token, body)
      else await progressApi.updateProfile(studentId, body)
      toast.success('Profile updated')
      load()
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setProfileBusy(false)
    }
  }

  async function handleUnitChange(next) {
    try {
      if (mode === 'parent') await parentApi.setMeasurementUnit(token, next)
      else await progressApi.setMeasurementUnit(studentId, next)
      load()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  function openAdd() {
    setForm(emptyForm())
    setModal(true)
  }

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
      if (mode === 'parent') await parentApi.createProgress(token, body)
      else await progressApi.create(studentId, body)
      setModal(false)
      toast.success('Progress logged')
      load()
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteId || mode !== 'coach') return
    setDeleteBusy(true)
    try {
      await progressApi.delete(studentId, deleteId)
      setDeleteId(null)
      toast.success('Entry removed')
      load()
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading && !summary) {
    return <p className="text-slate-500">Loading progress…</p>
  }

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-6'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded && (
          <div>
            {onBack && (
              <button type="button" onClick={onBack} className="text-sm text-brand hover:underline mb-1">
                ← Back
              </button>
            )}
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FiActivity className="text-brand" />
              Progress — {displayName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Body fat can be calculated from gender, height, neck, waist{profileForm.gender === 'Female' ? ', hips' : ''}, and weight — or entered manually.
            </p>
          </div>
        )}
        {embedded && (
          <p className="text-sm text-slate-500 w-full">
            Log weight and measurements. Body fat can be estimated from your profile and measurements.
          </p>
        )}
        <div className={`flex flex-wrap gap-2 items-center ${embedded ? 'w-full justify-between' : ''}`}>
          <Select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="w-36"
            aria-label="Units"
          >
            <option value="Imperial">Imperial (lb, in)</option>
            <option value="Metric">Metric (kg, cm)</option>
          </Select>
          <Button onClick={openAdd}>
            <FiPlus />
            Log check-in
          </Button>
        </div>
      </div>

      {err && (
        <Alert variant="error" onDismiss={() => setErr('')}>
          {err}
        </Alert>
      )}

      <Card>
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">Body profile</h2>
          <p className="text-sm text-slate-500 mt-0.5">Used for body fat estimates on each check-in.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={profileForm.gender}
              onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
            >
              <option value="Unspecified">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input
              label={heightLabel(unit)}
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              value={profileForm.height}
              onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))}
              placeholder={unit === 'Imperial' ? 'e.g. 64' : 'e.g. 170'}
            />
            <Input
              label="Date of birth"
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(e) => setProfileForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
              className="sm:col-span-2"
            />
          </div>

          <ProfileReadOnlyField
            label="Age"
            value={displayAge != null ? `${displayAge} years` : '—'}
            hint="Calculated from date of birth"
            className="max-w-[9rem]"
          />

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              US Navy body fat estimate needs: {navyFields}.
            </p>
            <Button type="submit" disabled={profileBusy} size="sm" className="sm:shrink-0 w-full sm:w-auto">
              {profileBusy ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>

      {delta && (
        <div className="grid sm:grid-cols-2 gap-3">
          <DeltaCard
            label="Latest weight"
            value={formatWeight(delta.latestWeight, unit)}
            delta={delta.weightChangeSincePrevious}
            unit={unit}
            type="weight"
          />
          <Card>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Body fat</p>
            <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
              {delta.latestBodyFatPercent != null ? `${delta.latestBodyFatPercent}%` : '—'}
            </p>
            {delta.latestBodyFatMethod && (
              <p className="text-xs text-slate-500 mt-1">{bodyFatMethodLabel(delta.latestBodyFatMethod)}</p>
            )}
            {delta.bodyFatChangeSincePrevious != null && (
              <p className="text-xs text-slate-600 mt-1">
                Since last: {formatDelta(delta.bodyFatChangeSincePrevious, unit, 'bodyFat')}
              </p>
            )}
          </Card>
        </div>
      )}

      {chart && (
        <div className="grid lg:grid-cols-3 gap-4">
          <ProgressLineChart title={weightLabel(unit)} points={chart.weight} color="bg-teal-600" />
          <ProgressLineChart title="Body fat %" points={chart.bodyFat} color="bg-amber-500" />
          <ProgressLineChart title={`Waist (${lengthLabel(unit)})`} points={chart.waist} color="bg-violet-500" />
        </div>
      )}

      <Card padding={false} className="overflow-hidden">
        <h2 className="px-4 py-3 font-semibold text-slate-900 border-b border-slate-100">Check-in history</h2>
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">No check-ins yet. Log the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">Date</th>
                  <th className="text-left p-3 font-medium text-slate-600">Weight</th>
                  <th className="text-left p-3 font-medium text-slate-600">Body fat</th>
                  <th className="text-left p-3 font-medium text-slate-600">Method</th>
                  <th className="text-left p-3 font-medium text-slate-600">Waist</th>
                  <th className="text-left p-3 font-medium text-slate-600">Source</th>
                  {mode === 'coach' && <th className="p-3 w-12" />}
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3">{new Date(row.recordedOn).toLocaleDateString()}</td>
                    <td className="p-3 tabular-nums">{formatWeight(row.weight, unit)}</td>
                    <td className="p-3 tabular-nums">{row.bodyFatPercent != null ? `${row.bodyFatPercent}%` : '—'}</td>
                    <td className="p-3 text-xs text-slate-500">{bodyFatMethodLabel(row.bodyFatMethod) || '—'}</td>
                    <td className="p-3 tabular-nums">{formatLength(row.measurements?.waist, unit)}</td>
                    <td className="p-3 text-slate-500 text-xs">{row.source === 'ParentPortal' ? 'Client' : 'Coach'}</td>
                    {mode === 'coach' && (
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteId(row.id)}>
                          <FiTrash2 />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <Modal
          title="Log check-in"
          onClose={() => setModal(false)}
          wide
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button type="submit" form="progress-form" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          }
        >
          <form id="progress-form" onSubmit={handleSubmit} className="space-y-3">
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
            <p className="text-sm font-medium text-slate-700">Circumferences for body fat ({lengthLabel(unit)})</p>
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
            </div>
            <p className="text-sm font-medium text-slate-700">Other measurements ({lengthLabel(unit)})</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete check-in?"
        description="This removes the entry from the progress history."
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
