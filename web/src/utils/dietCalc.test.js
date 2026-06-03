import assert from 'node:assert/strict'
import { computeDietPlan, formatBmiWithSuggestion, basalMetabolicRate } from './dietCalc.js'

const plan = computeDietPlan({
  gender: 'Female',
  ageYears: 38,
  height: 59,
  weight: 137.5,
  unit: 'Imperial',
  activityLevel: 'moderate',
  goal: 'lose',
})

assert.ok(plan.ready, 'plan should be ready')
assert.ok(plan.bmiDisplay?.includes('suggested 18.5–24.9'))
assert.ok(plan.maintenance > 1200)
assert.ok(plan.calories < plan.maintenance)
assert.ok(plan.macros.proteinG > 50)
assert.ok(plan.steps >= 8000)

const bmr = basalMetabolicRate('Female', 62.4, 149.9, 38)
assert.ok(bmr > 1000 && bmr < 2000)

assert.equal(formatBmiWithSuggestion(22), '22.0 (suggested 18.5–24.9)')

console.log('dietCalc.test.js: all passed')
