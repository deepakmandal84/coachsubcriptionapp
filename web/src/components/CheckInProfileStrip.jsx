import { ageYearsFromDob } from '../utils/bodyCompositionResults'
import { heightLabel } from '../utils/progressUnits'

export default function CheckInProfileStrip({ profile, unit, onEditProfile }) {
  const gender = profile?.gender || 'Not set'
  const height = profile?.height
  const dob = profile?.dateOfBirth
  const age = profile?.ageYears ?? ageYearsFromDob(dob)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Body profile (for body fat)</p>
        {onEditProfile && (
          <button type="button" onClick={onEditProfile} className="text-xs text-brand hover:underline">
            Edit profile
          </button>
        )}
      </div>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 text-slate-800">
        <div>
          <dt className="text-[10px] uppercase text-slate-400">Gender</dt>
          <dd className="font-medium tabular-nums">{gender}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-slate-400">{heightLabel(unit).replace(' (in)', '').replace(' (cm)', '')}</dt>
          <dd className="font-medium tabular-nums">{height != null ? `${height} ${unit === 'Imperial' ? 'in' : 'cm'}` : '—'}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-slate-400">Age</dt>
          <dd className="font-medium tabular-nums">{age != null ? `${age} yrs` : '—'}</dd>
        </div>
      </dl>
    </div>
  )
}
