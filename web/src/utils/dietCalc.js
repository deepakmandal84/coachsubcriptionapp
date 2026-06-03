import { computeBmi, bmiCategory } from './progressStats.js'
import { isImperial } from './progressUnits.js'

/** Healthy BMI range (WHO / clinical standard for adults). */
export const SUGGESTED_BMI = { min: 18.5, max: 24.9 }

export function formatBmiWithSuggestion(bmi) {
  if (bmi == null || Number.isNaN(Number(bmi))) return null
  return `${Number(bmi).toFixed(1)} (suggested ${SUGGESTED_BMI.min}–${SUGGESTED_BMI.max})`
}

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary (desk job, little exercise)', factor: 1.2 },
  { id: 'light', label: 'Light (1–3 days/week)', factor: 1.375 },
  { id: 'moderate', label: 'Moderate (3–5 days/week)', factor: 1.55 },
  { id: 'active', label: 'Active (6–7 days/week)', factor: 1.725 },
  { id: 'very_active', label: 'Very active (athlete / physical job)', factor: 1.9 },
]

const LB_PER_KG = 2.2046226218
const CM_PER_IN = 2.54

function toKg(weight, unit) {
  if (weight == null || Number.isNaN(Number(weight))) return null
  const n = Number(weight)
  return isImperial(unit) ? n / LB_PER_KG : n
}

function toCm(height, unit) {
  if (height == null || Number.isNaN(Number(height))) return null
  const n = Number(height)
  return isImperial(unit) ? n * CM_PER_IN : n
}

/** Mifflin–St Jeor BMR (kcal/day). */
export function basalMetabolicRate(gender, weightKg, heightCm, ageYears) {
  if (!weightKg || !heightCm || ageYears == null || ageYears < 10) return null
  const g = String(gender || '').toLowerCase()
  if (g !== 'male' && g !== 'female') return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return Math.round(g === 'male' ? base + 5 : base - 161)
}

export function maintenanceCalories(bmr, activityLevelId) {
  if (bmr == null) return null
  const level = ACTIVITY_LEVELS.find((l) => l.id === activityLevelId) || ACTIVITY_LEVELS[1]
  return Math.round(bmr * level.factor)
}

export function weightLossCalories(maintenance, gender) {
  if (maintenance == null) return null
  const target = Math.round(maintenance - 500)
  const floor = String(gender || '').toLowerCase() === 'female' ? 1200 : 1500
  return Math.max(target, floor)
}

export function macroTargets(calories, weightKg, goal = 'lose') {
  if (calories == null || !weightKg) return null
  const proteinG = Math.round((goal === 'lose' ? 1.8 : 1.4) * weightKg)
  const proteinKcal = proteinG * 4
  const fatPct = goal === 'lose' ? 0.28 : 0.3
  const fatKcal = calories * fatPct
  const fatG = Math.round(fatKcal / 9)
  const carbKcal = Math.max(0, calories - proteinKcal - fatKcal)
  const carbsG = Math.round(carbKcal / 4)
  return { proteinG, carbsG, fatG }
}

export function suggestedSteps(activityLevelId, goal = 'lose') {
  const map = {
    sedentary: { lose: 8000, maintain: 6000 },
    light: { lose: 9000, maintain: 7000 },
    moderate: { lose: 10000, maintain: 8000 },
    active: { lose: 11000, maintain: 9000 },
    very_active: { lose: 12000, maintain: 10000 },
  }
  const row = map[activityLevelId] || map.moderate
  return goal === 'lose' ? row.lose : row.maintain
}

export function computeDietPlan({
  gender,
  ageYears,
  height,
  weight,
  unit,
  activityLevel = 'moderate',
  goal = 'lose',
}) {
  const weightKg = toKg(weight, unit)
  const heightCm = toCm(height, unit)
  const bmi = computeBmi(weight, height, unit)
  const bmiInfo = bmiCategory(bmi)
  const bmr = basalMetabolicRate(gender, weightKg, heightCm, ageYears)
  const maintenance = maintenanceCalories(bmr, activityLevel)
  const calories =
    goal === 'lose' ? weightLossCalories(maintenance, gender) : maintenance
  const macros = macroTargets(calories, weightKg, goal)
  const steps = suggestedSteps(activityLevel, goal)

  const ready = bmr != null && maintenance != null && macros != null

  return {
    ready,
    bmi,
    bmiInfo,
    bmiDisplay: formatBmiWithSuggestion(bmi),
    bmr,
    maintenance,
    calories,
    macros,
    steps,
    goal,
    activityLevel,
  }
}
