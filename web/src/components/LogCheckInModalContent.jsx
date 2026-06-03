import Input from './ui/Input'
import CheckInProfileStrip from './CheckInProfileStrip'
import BodyCompositionResults from './BodyCompositionResults'
import {
  BODY_FAT_MEASUREMENT_FIELDS,
  OTHER_MEASUREMENT_FIELDS,
  lengthLabel,
  weightLabel,
} from '../utils/progressUnits'
import { bodyFatMethodLabel } from '../utils/bodyFatCalc'

export default function LogCheckInModalContent({
  formId,
  form,
  setForm,
  unit,
  profile,
  compositionSummary,
  onEditProfile,
  err,
}) {
  const autoHint =
    form.bodyFatPercent === '' && compositionSummary?.ready
      ? `Auto: ${compositionSummary.primaryPercent}%`
      : 'Auto when possible'

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
      <div className="space-y-3 min-w-0">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <CheckInProfileStrip profile={profile} unit={unit} onEditProfile={onEditProfile} />
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
              placeholder={autoHint}
            />
            {form.bodyFatPercent === '' && compositionSummary?.ready && (
              <p className="text-xs text-brand mt-1">
                Estimated {compositionSummary.primaryPercent}% ({bodyFatMethodLabel(compositionSummary.primaryMethod)})
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
      </div>
      <div className="lg:sticky lg:top-0">
        <BodyCompositionResults summary={compositionSummary} />
      </div>
    </div>
  )
}
