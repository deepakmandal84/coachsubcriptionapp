import { useMemo, useState } from 'react'
import { FiActivity, FiInfo } from 'react-icons/fi'
import { useParentPortal } from '../../context/ParentPortalContext'
import { useParentProgress } from '../../context/ParentProgressContext'
import Select from '../ui/Select'
import { formatWeight, heightLabel } from '../../utils/progressUnits'
import { ageYearsFromDob } from '../../utils/bodyCompositionResults'
import { ACTIVITY_LEVELS, computeDietPlan, SUGGESTED_BMI } from '../../utils/dietCalc'

function ResultRow({ label, value, hint }) {
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <p className="text-sm font-semibold text-slate-900 tabular-nums text-right shrink-0">{value}</p>
    </div>
  )
}

export default function ParentPortalDiet() {
  const { primary } = useParentPortal()
  const { profile, unit, stats, loading } = useParentProgress()
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [goal, setGoal] = useState('lose')

  const ageYears = profile?.ageYears ?? ageYearsFromDob(profile?.dateOfBirth)
  const weight = stats?.currentWeight ?? stats?.startWeight

  const plan = useMemo(
    () =>
      computeDietPlan({
        gender: profile?.gender,
        ageYears,
        height: profile?.height,
        weight,
        unit,
        activityLevel,
        goal,
      }),
    [profile, ageYears, weight, unit, activityLevel, goal]
  )

  const missing = []
  if (!profile?.gender || profile.gender === 'Unspecified') missing.push('gender')
  if (!profile?.height) missing.push('height')
  if (!profile?.dateOfBirth && ageYears == null) missing.push('date of birth')
  if (weight == null) missing.push('weight (log a check-in)')

  if (loading && !profile) {
    return <p className="text-slate-500 text-center py-10 animate-pulse text-sm">Loading…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        Estimates from your profile and latest weight. Adjust activity level and goal — not medical advice; your coach
        may personalize targets.
      </p>

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Complete your profile to calculate</p>
          <p className="text-xs mt-1">Still needed: {missing.join(', ')}. Use Progress → Body profile and log weight.</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FiInfo className="text-brand" />
            Your basics
          </h2>
        </div>
        <dl className="px-4 py-2 divide-y divide-slate-100 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Gender</dt>
            <dd className="font-medium text-slate-900">{profile?.gender || '—'}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Age</dt>
            <dd className="font-medium text-slate-900 tabular-nums">{ageYears != null ? `${ageYears} yrs` : '—'}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">{heightLabel(unit)}</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {profile?.height != null ? profile.height : '—'}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Current weight</dt>
            <dd className="font-medium text-slate-900 tabular-nums">
              {weight != null ? formatWeight(weight, unit) : '—'}
            </dd>
          </div>
          {plan.bmiDisplay && (
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">BMI</dt>
              <dd className="font-medium text-slate-900 text-right flex flex-col items-end gap-1">
                <span className="tabular-nums">{plan.bmiDisplay}</span>
                {plan.bmiInfo && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${plan.bmiInfo.badge}`}>
                    {plan.bmiInfo.label}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
        <Select
          label="Activity level"
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
        >
          {ACTIVITY_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
        <Select label="Goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="lose">Lose weight (~500 kcal deficit)</option>
          <option value="maintain">Maintain weight</option>
        </Select>
      </div>

      {plan.ready ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div
            className="px-4 py-3 border-b border-slate-100"
            style={{ background: `linear-gradient(90deg, ${primary}14, transparent)` }}
          >
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FiActivity style={{ color: primary }} />
              {goal === 'lose' ? 'Weight loss plan' : 'Maintenance plan'}
            </h2>
          </div>
          <div className="px-4 py-1">
            <ResultRow label="Basal metabolic rate (BMR)" value={`${plan.bmr} kcal`} hint="Energy at rest" />
            <ResultRow
              label="Maintenance calories"
              value={`${plan.maintenance} kcal/day`}
              hint="Estimated to stay at current weight"
            />
            <ResultRow
              label={goal === 'lose' ? 'Suggested intake (weight loss)' : 'Suggested intake'}
              value={`${plan.calories} kcal/day`}
              hint={goal === 'lose' ? 'About 500 kcal below maintenance' : 'Matches maintenance'}
            />
            <ResultRow
              label="Protein"
              value={`${plan.macros.proteinG} g/day`}
              hint={goal === 'lose' ? '~1.8 g per kg body weight' : '~1.4 g per kg'}
            />
            <ResultRow label="Carbohydrates" value={`${plan.macros.carbsG} g/day`} hint="Remaining calories after protein & fat" />
            <ResultRow label="Fat" value={`${plan.macros.fatG} g/day`} hint={goal === 'lose' ? '~28% of calories' : '~30% of calories'} />
            <ResultRow
              label="Daily steps target"
              value={`${plan.steps.toLocaleString()} steps`}
              hint="Walking supports fat loss and health"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">Fill in the missing profile fields above to see your plan.</p>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Healthy BMI for most adults: {SUGGESTED_BMI.min}–{SUGGESTED_BMI.max}. Values are estimates (Mifflin–St Jeor BMR,
        standard macro split). Your coach can adjust targets for your program.
      </p>
    </div>
  )
}
