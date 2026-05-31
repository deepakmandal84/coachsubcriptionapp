const CM_PER_IN = 2.54
const LB_PER_KG = 2.2046226218

function toIn(cm) {
  if (cm == null || cm === '') return null
  const n = Number(cm)
  return Number.isNaN(n) ? null : n / CM_PER_IN
}

function kgFromUser(weight, unit) {
  if (weight == null || weight === '') return null
  const n = Number(weight)
  if (Number.isNaN(n)) return null
  return unit === 'Imperial' ? n / LB_PER_KG : n
}

function cmFromUser(length, unit) {
  if (length == null || length === '') return null
  const n = Number(length)
  if (Number.isNaN(n)) return null
  return unit === 'Imperial' ? n * CM_PER_IN : n
}

function ageYears(dobIso) {
  if (!dobIso) return null
  const dob = new Date(dobIso)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export function tryNavyBodyFat(gender, heightCm, measurementsCm) {
  const g = String(gender || '').toLowerCase()
  if (g !== 'male' && g !== 'female') return null
  if (!heightCm || heightCm < 100) return null
  const neck = measurementsCm?.neck
  const waist = measurementsCm?.waist
  if (!neck || !waist) return null

  const heightIn = heightCm / CM_PER_IN
  const neckIn = neck / CM_PER_IN
  const waistIn = waist / CM_PER_IN

  let bf
  if (g === 'male') {
    if (waistIn <= neckIn) return null
    bf = 86.01 * Math.log10(waistIn - neckIn) - 70.041 * Math.log10(heightIn) + 36.76
  } else {
    const hips = measurementsCm?.hips
    if (!hips) return null
    const hipIn = hips / CM_PER_IN
    if (waistIn + hipIn <= neckIn) return null
    bf = 163.205 * Math.log10(waistIn + hipIn - neckIn) - 97.684 * Math.log10(heightIn) - 78.387
  }
  if (!Number.isFinite(bf)) return null
  return Math.round(Math.min(60, Math.max(3, bf)) * 10) / 10
}

export function tryBmiBodyFat(gender, heightCm, weightKg, dobIso) {
  const g = String(gender || '').toLowerCase()
  if (g !== 'male' && g !== 'female') return null
  if (!heightCm || !weightKg) return null
  const age = ageYears(dobIso)
  if (age == null || age < 10) return null
  const hm = heightCm / 100
  const bmi = weightKg / (hm * hm)
  const sex = g === 'male' ? 1 : 0
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4
  if (!Number.isFinite(bf)) return null
  return Math.round(Math.min(60, Math.max(3, bf)) * 10) / 10
}

export function previewBodyFat({ gender, height, dateOfBirth, unit, weight, measurements }) {
  const heightCm = cmFromUser(height, unit)
  const m = {}
  for (const [k, v] of Object.entries(measurements || {})) {
    const cm = cmFromUser(v, unit)
    if (cm != null) m[k] = cm
  }
  const weightKg = kgFromUser(weight, unit)
  const navy = tryNavyBodyFat(gender, heightCm, m)
  if (navy != null) return { percent: navy, method: 'Navy' }
  const bmi = tryBmiBodyFat(gender, heightCm, weightKg, dateOfBirth)
  if (bmi != null) return { percent: bmi, method: 'BmiEstimate' }
  return { percent: null, method: null }
}

export function bodyFatMethodLabel(method) {
  if (method === 'Navy') return 'US Navy (circumference)'
  if (method === 'BmiEstimate') return 'BMI + age estimate'
  if (method === 'Manual') return 'Manual'
  return ''
}
