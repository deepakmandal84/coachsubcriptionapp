import { useEffect, useMemo, useState } from 'react'
import { parentApi } from '../../api'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import LogCheckInModalContent from '../LogCheckInModalContent'
import { emptyMeasurements, measurementsToPayload } from '../../utils/progressUnits'
import { computeBodyCompositionSummary } from '../../utils/bodyCompositionResults'
import { formatError } from '../../utils/formatError'
import { useToast } from '../../context/ToastContext'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function CheckInFormModal({ open, onClose, token, unit, profile, onSaved, onEditProfile }) {
  const toast = useToast()
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

  const compositionSummary = useMemo(
    () =>
      computeBodyCompositionSummary({
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
      toast.success('Done — check-in saved')
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
      <form id="parent-checkin-form" onSubmit={handleSubmit}>
        <LogCheckInModalContent
          form={form}
          setForm={setForm}
          unit={unit}
          profile={profile}
          compositionSummary={compositionSummary}
          onEditProfile={onEditProfile}
          err={err}
        />
      </form>
    </Modal>
  )
}
