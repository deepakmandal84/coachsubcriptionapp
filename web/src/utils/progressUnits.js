export function isImperial(unit) {
  return String(unit || 'Imperial').toLowerCase() !== 'metric'
}

export function weightLabel(unit) {
  return isImperial(unit) ? 'Weight (lb)' : 'Weight (kg)'
}

export function lengthLabel(unit) {
  return isImperial(unit) ? 'in' : 'cm'
}

export function heightLabel(unit) {
  return isImperial(unit) ? 'Height (in)' : 'Height (cm)'
}

/** Used for US Navy body fat formula */
export const BODY_FAT_MEASUREMENT_FIELDS = [
  { key: 'neck', label: 'Neck', required: true },
  { key: 'waist', label: 'Waist (navel)', required: true },
  { key: 'hips', label: 'Hips', requiredForFemale: true },
]

export const OTHER_MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'leftArm', label: 'Left arm' },
  { key: 'rightArm', label: 'Right arm' },
  { key: 'leftThigh', label: 'Left thigh' },
  { key: 'rightThigh', label: 'Right thigh' },
]

export function formatWeight(value, unit) {
  if (value == null || Number.isNaN(value)) return '—'
  const n = Number(value)
  return isImperial(unit) ? `${n.toFixed(1)} lb` : `${n.toFixed(1)} kg`
}

export function formatLength(value, unit) {
  if (value == null || Number.isNaN(value)) return '—'
  const n = Number(value)
  const suffix = isImperial(unit) ? 'in' : 'cm'
  return `${n.toFixed(1)} ${suffix}`
}

export function formatDelta(value, unit, type = 'weight') {
  if (value == null || Number.isNaN(value)) return null
  const n = Number(value)
  const sign = n > 0 ? '+' : ''
  if (type === 'bodyFat') return `${sign}${n.toFixed(1)}%`
  return isImperial(unit) ? `${sign}${n.toFixed(1)} lb` : `${sign}${n.toFixed(1)} kg`
}

export const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'neck', label: 'Neck' },
  { key: 'leftArm', label: 'Left arm' },
  { key: 'rightArm', label: 'Right arm' },
  { key: 'leftThigh', label: 'Left thigh' },
  { key: 'rightThigh', label: 'Right thigh' },
]

export function emptyMeasurements() {
  return {
    chest: '',
    waist: '',
    hips: '',
    neck: '',
    leftArm: '',
    rightArm: '',
    leftThigh: '',
    rightThigh: '',
  }
}

export function measurementsFromDto(dto) {
  if (!dto) return emptyMeasurements()
  return {
    chest: dto.chest ?? '',
    waist: dto.waist ?? '',
    hips: dto.hips ?? '',
    neck: dto.neck ?? '',
    leftArm: dto.leftArm ?? '',
    rightArm: dto.rightArm ?? '',
    leftThigh: dto.leftThigh ?? '',
    rightThigh: dto.rightThigh ?? '',
  }
}

export function measurementsToPayload(form) {
  const out = {}
  for (const { key } of MEASUREMENT_FIELDS) {
    const raw = form[key]
    if (raw === '' || raw == null) continue
    const n = Number(raw)
    if (!Number.isNaN(n)) out[key] = n
  }
  const hasAny = Object.keys(out).length > 0
  return hasAny ? out : null
}
