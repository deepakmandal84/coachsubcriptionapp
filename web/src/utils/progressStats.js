import { isImperial } from './progressUnits.js'

const LB_PER_KG = 2.2046226218
const CM_PER_IN = 2.54

function toKg(weight, unit) {
  if (weight == null || Number.isNaN(Number(weight))) return null
  const n = Number(weight)
  return isImperial(unit) ? n / LB_PER_KG : n
}

function heightMeters(height, unit) {
  if (height == null || Number.isNaN(Number(height))) return null
  const n = Number(height)
  const cm = isImperial(unit) ? n * CM_PER_IN : n
  return cm / 100
}

export function computeBmi(weight, height, unit) {
  const kg = toKg(weight, unit)
  const hm = heightMeters(height, unit)
  if (kg == null || hm == null || hm <= 0) return null
  return kg / (hm * hm)
}

export function bmiCategory(bmi) {
  if (bmi == null || Number.isNaN(bmi)) return null
  if (bmi < 18.5) return { label: 'Underweight', badge: 'bg-sky-50 text-sky-800 border-sky-100' }
  if (bmi < 25) return { label: 'Normal', badge: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
  if (bmi < 30) return { label: 'Overweight', badge: 'bg-amber-50 text-amber-900 border-amber-100' }
  if (bmi < 35) return { label: 'Obese Class I', badge: 'bg-orange-50 text-orange-900 border-orange-100' }
  if (bmi < 40) return { label: 'Obese Class II', badge: 'bg-orange-50 text-orange-950 border-orange-100' }
  return { label: 'Obese Class III', badge: 'bg-red-50 text-red-900 border-red-100' }
}

function formatShortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Build dashboard stats from parent/coach progress summary payload. */
export function computeProgressOverview(summary) {
  const unit = summary?.profile?.measurementUnit || 'Imperial'
  const height = summary?.profile?.height
  const entries = summary?.entries || []
  const asc = [...entries]
    .filter((e) => e.recordedOn)
    .sort((a, b) => new Date(a.recordedOn) - new Date(b.recordedOn))

  const firstWeightEntry = asc.find((e) => e.weight != null)
  const lastWeightEntry = [...asc].reverse().find((e) => e.weight != null)
  const firstBfEntry = asc.find((e) => e.bodyFatPercent != null)
  const lastBfEntry = [...asc].reverse().find((e) => e.bodyFatPercent != null)

  const startWeight = firstWeightEntry?.weight ?? null
  const currentWeight = lastWeightEntry?.weight ?? summary?.latestDelta?.latestWeight ?? null
  const startBodyFat = firstBfEntry?.bodyFatPercent ?? null
  const currentBodyFat = lastBfEntry?.bodyFatPercent ?? summary?.latestDelta?.latestBodyFatPercent ?? null

  const weightLost =
    startWeight != null && currentWeight != null ? Number((startWeight - currentWeight).toFixed(1)) : null
  const weightLostPct =
    startWeight > 0 && weightLost != null ? Number(((weightLost / startWeight) * 100).toFixed(1)) : null
  const bodyFatLost =
    startBodyFat != null && currentBodyFat != null
      ? Number((startBodyFat - currentBodyFat).toFixed(1))
      : null
  const bodyFatLostPct =
    startBodyFat > 0 && bodyFatLost != null ? Number(((bodyFatLost / startBodyFat) * 100).toFixed(1)) : null

  const startBmi = computeBmi(startWeight, height, unit)
  const currentBmi = computeBmi(currentWeight, height, unit)
  const bmiInfo = bmiCategory(currentBmi)

  const checkInCount = entries.length
  const progressPercent =
    weightLostPct != null && weightLost > 0 ? Math.min(100, Math.max(0, weightLostPct)) : checkInCount > 0 ? 0 : null

  const firstDate = asc[0]?.recordedOn ?? null
  const daysSinceStart = firstDate
    ? Math.max(0, Math.floor((Date.now() - new Date(firstDate).getTime()) / 86400000))
    : 0
  const timePercent = daysSinceStart > 0 ? Math.min(100, (daysSinceStart / 365) * 100) : 0

  return {
    unit,
    height,
    startWeight,
    startDate: firstWeightEntry?.recordedOn ?? firstDate,
    startBmi,
    currentWeight,
    currentDate: lastWeightEntry?.recordedOn ?? summary?.latestDelta?.latestRecordedOn,
    currentBmi,
    bmiInfo,
    startBodyFat,
    currentBodyFat,
    weightLost,
    weightLostPct,
    bodyFatLost,
    bodyFatLostPct,
    progressPercent,
    timePercent,
    checkInCount,
    hasData: checkInCount > 0,
    startLabel: formatShortDate(firstWeightEntry?.recordedOn ?? firstDate),
    currentLabel: formatShortDate(lastWeightEntry?.recordedOn ?? summary?.latestDelta?.latestRecordedOn),
  }
}

export function weekNumberForCheckIn(recordedOn, firstRecordedOn) {
  if (!recordedOn || !firstRecordedOn) return 1
  const start = new Date(firstRecordedOn)
  const d = new Date(recordedOn)
  start.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d - start) / 86400000)
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

export function formatCheckInDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
