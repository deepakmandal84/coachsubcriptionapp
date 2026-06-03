import assert from 'node:assert/strict'
import {
  computeBodyCompositionSummary,
  idealJacksonPollockPercent,
  bodyFatCategory,
} from './bodyCompositionResults.js'
import { tryNavyBodyFat } from './bodyFatCalc.js'
// Note: Vite resolves extensionless imports; Node tests use .js suffix.

const CM_PER_IN = 2.54

function navyFemale(heightIn, neckIn, waistIn, hipIn) {
  const heightCm = heightIn * CM_PER_IN
  const m = {
    neck: neckIn * CM_PER_IN,
    waist: waistIn * CM_PER_IN,
    hips: hipIn * CM_PER_IN,
  }
  return tryNavyBodyFat('female', heightCm, m)
}

// Golden case: calculator.net female, age 38, 137.5 lb, 59 in, neck 13.5, waist 34, hip 40.5
const golden = computeBodyCompositionSummary({
  gender: 'Female',
  height: 59,
  dateOfBirth: '1988-01-15',
  unit: 'Imperial',
  weight: 137.5,
  measurements: { neck: 13.5, waist: 34, hips: 40.5 },
})

assert.ok(golden.ready, 'summary should be ready')
assert.ok(Math.abs(golden.navyPercent - 40) <= 0.2, `navy ~40% got ${golden.navyPercent}`)
assert.equal(golden.category, 'Obese')
assert.ok(Math.abs(golden.fatMass - 55) <= 0.5, `fat mass ~55 got ${golden.fatMass}`)
assert.ok(Math.abs(golden.leanMass - 82.5) <= 0.5, `lean mass ~82.5 got ${golden.leanMass}`)
assert.ok(Math.abs(idealJacksonPollockPercent('female', 38) - 21.9) <= 0.15, 'ideal ~21.9% at age 38')
assert.ok(Math.abs(golden.fatToLose - 25) <= 0.5, `fat to lose ~25 got ${golden.fatToLose}`)

assert.ok(Math.abs(navyFemale(59, 13.5, 34, 40.5) - 40.1) <= 0.15, 'raw navy ~40.1%')

console.log('bodyCompositionResults.test.js: all passed')
