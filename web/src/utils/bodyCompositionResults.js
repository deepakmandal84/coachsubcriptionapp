import { previewBodyFat, tryNavyBodyFat, tryBmiBodyFat } from './bodyFatCalc.js'
import { isImperial } from './progressUnits.js'

const CM_PER_IN = 2.54

/** Jackson & Pollock ideal body fat % (calculator.net table, linear interpolation). */
const JP_IDEAL = {
  female: [
    [20, 17.7],
    [25, 18.4],
    [30, 19.3],
    [35, 21.5],
    [40, 22.2],
    [45, 22.9],
    [50, 25.2],
    [55, 26.3],
  ],
  male: [
    [20, 8.5],
    [25, 10.5],
    [30, 12.7],
    [35, 13.7],
    [40, 15.3],
    [45, 16.4],
    [50, 18.9],
    [55, 20.9],
  ],
}

function cmFromUser(length, unit) {
  if (length == null || length === '') return null
  const n = Number(length)
  if (Number.isNaN(n)) return null
  return isImperial(unit) ? n * CM_PER_IN : n
}

export function ageYearsFromDob(dobIso) {
  if (!dobIso) return null
  const dob = new Date(`${String(dobIso).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 0 ? age : null
}

export function idealJacksonPollockPercent(gender, ageYears) {
  const g = String(gender || '').toLowerCase()
  const table = JP_IDEAL[g]
  if (!table || ageYears == null || ageYears < 0) return null
  if (ageYears <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (ageYears >= last[0]) return last[1]
  for (let i = 0; i < table.length - 1; i++) {
    const [a0, v0] = table[i]
    const [a1, v1] = table[i + 1]
    if (ageYears >= a0 && ageYears <= a1) {
      const t = (ageYears - a0) / (a1 - a0)
      return Math.round((v0 + t * (v1 - v0)) * 10) / 10
    }
  }
  return null
}

/** ACE-style body fat category labels (aligned with common calculator bands). */
export function bodyFatCategory(gender, percent) {
  if (percent == null || Number.isNaN(percent)) return null
  const g = String(gender || '').toLowerCase()
  const p = Number(percent)
  if (g === 'female') {
    if (p < 14) return 'Essential fat'
    if (p <= 20) return 'Athletes'
    if (p <= 24) return 'Fitness'
    if (p <= 31) return 'Average'
    return 'Obese'
  }
  if (g === 'male') {
    if (p < 6) return 'Essential fat'
    if (p <= 13) return 'Athletes'
    if (p <= 17) return 'Fitness'
    if (p <= 24) return 'Average'
    return 'Obese'
  }
  return null
}

function measurementsCm(measurements, unit) {
  const m = {}
  for (const [k, v] of Object.entries(measurements || {})) {
    const cm = cmFromUser(v, unit)
    if (cm != null) m[k] = cm
  }
  return m
}

export function bodyFatPreviewMissingFields({ gender, height, dateOfBirth, unit, weight, measurements }) {
  const missing = []
  const g = String(gender || '').toLowerCase()
  if (g !== 'male' && g !== 'female') missing.push('Gender (in Body profile)')
  if (!height || Number(height) <= 0) missing.push('Height (in Body profile)')
  const m = measurements || {}
  if (!m.neck) missing.push('Neck')
  if (!m.waist) missing.push('Waist')
  if (g === 'female' && !m.hips) missing.push('Hips')
  if (weight === '' || weight == null) missing.push('Weight')
  const heightCm = cmFromUser(height, unit)
  const mCm = measurementsCm(m, unit)
  const navy = tryNavyBodyFat(gender, heightCm, mCm)
  if (navy == null && !dateOfBirth) missing.push('Date of birth (for BMI estimate if Navy unavailable)')
  return missing
}

/**
 * Full composition breakdown for calculator-style results panel.
 * @param {object} opts
 * @param {number|null} opts.storedBodyFatPercent - saved check-in value (overrides preview primary when set)
 * @param {string|null} opts.storedBodyFatMethod
 */
export function computeBodyCompositionSummary({
  gender,
  height,
  dateOfBirth,
  unit,
  weight,
  measurements,
  storedBodyFatPercent = null,
  storedBodyFatMethod = null,
}) {
  const heightCm = cmFromUser(height, unit)
  const mCm = measurementsCm(measurements, unit)
  const age = ageYearsFromDob(dateOfBirth)
  const navyPercent = tryNavyBodyFat(gender, heightCm, mCm)
  const weightNum = weight === '' || weight == null ? null : Number(weight)
  const weightKg =
    weightNum == null || Number.isNaN(weightNum)
      ? null
      : isImperial(unit)
        ? weightNum / 2.2046226218
        : weightNum
  const bmiPercent = tryBmiBodyFat(gender, heightCm, weightKg, dateOfBirth)

  const preview = previewBodyFat({ gender, height, dateOfBirth, unit, weight, measurements })
  const primaryPercent =
    storedBodyFatPercent != null && storedBodyFatPercent !== ''
      ? Number(storedBodyFatPercent)
      : preview.percent
  const primaryMethod = storedBodyFatMethod || preview.method

  if (primaryPercent == null || Number.isNaN(primaryPercent)) {
    return {
      ready: false,
      missing: bodyFatPreviewMissingFields({ gender, height, dateOfBirth, unit, weight, measurements }),
      navyPercent,
      bmiPercent,
    }
  }

  const idealPercent = idealJacksonPollockPercent(gender, age)
  const category = bodyFatCategory(gender, primaryPercent)
  const imperial = isImperial(unit)

  let fatMass = null
  let leanMass = null
  let fatToLose = null
  const massUnit = imperial ? 'lb' : 'kg'

  if (weightNum != null && !Number.isNaN(weightNum)) {
    fatMass = Math.round(((weightNum * primaryPercent) / 100) * 10) / 10
    leanMass = Math.round((weightNum - fatMass) * 10) / 10
    if (idealPercent != null && primaryPercent > idealPercent) {
      fatToLose = Math.round((((primaryPercent - idealPercent) * weightNum) / 100) * 10) / 10
    } else {
      fatToLose = 0
    }
  }

  const heightDisplay =
    height != null && height !== ''
      ? imperial
        ? `${height} in`
        : `${height} cm`
      : null

  return {
    ready: true,
    primaryPercent,
    primaryMethod,
    navyPercent,
    bmiPercent,
    category,
    idealPercent,
    fatMass,
    leanMass,
    fatToLose,
    massUnit,
    age,
    profileNote: [
      gender && gender !== 'Unspecified' ? gender : null,
      heightDisplay ? `Height ${heightDisplay}` : null,
      age != null ? `Age ${age}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
  }
}
