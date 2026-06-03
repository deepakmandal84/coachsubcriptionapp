import { bodyFatMethodLabel } from '../utils/bodyFatCalc'

function ResultRow({ label, value, highlight }) {
  if (value == null || value === '') return null
  return (
    <tr className={highlight ? 'bg-emerald-50/80' : 'border-t border-slate-100'}>
      <td className="py-2 pr-3 text-slate-600 text-sm">{label}</td>
      <td className="py-2 text-right font-medium text-slate-900 tabular-nums text-sm">{value}</td>
    </tr>
  )
}

export default function BodyCompositionResults({ summary, compact = false }) {
  if (!summary?.ready) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-200 bg-slate-50 ${compact ? 'p-3' : 'p-4'}`}>
        <p className="text-sm font-medium text-slate-700">Result</p>
        <p className="text-xs text-slate-500 mt-1">Enter measurements and ensure body profile is complete to see estimates.</p>
        {summary?.missing?.length > 0 && (
          <ul className="mt-2 text-xs text-amber-800 list-disc list-inside">
            {summary.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const { primaryPercent, primaryMethod, navyPercent, bmiPercent, category, idealPercent, fatMass, leanMass, fatToLose, massUnit, profileNote } =
    summary
  const headline = navyPercent != null ? navyPercent : primaryPercent

  return (
    <div className={`rounded-xl border border-slate-200 overflow-hidden ${compact ? '' : 'shadow-sm'}`}>
      <div className="bg-emerald-600 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">Result</p>
        <p className="text-xl font-bold text-white tabular-nums mt-0.5">Body Fat: {headline}%</p>
        {primaryMethod && (
          <p className="text-xs text-emerald-100 mt-0.5">{bodyFatMethodLabel(primaryMethod)}</p>
        )}
      </div>
      <table className="w-full px-3">
        <tbody>
          <ResultRow
            label="Body Fat (U.S. Navy Method)"
            value={navyPercent != null ? `${navyPercent}%` : null}
          />
          <ResultRow label="Body Fat Category" value={category} />
          <ResultRow
            label="Body Fat Mass"
            value={fatMass != null ? `${fatMass} ${massUnit}` : null}
          />
          <ResultRow
            label="Lean Body Mass"
            value={leanMass != null ? `${leanMass} ${massUnit}` : null}
          />
          <ResultRow
            label="Ideal Body Fat for Given Age (Jackson & Pollock)"
            value={idealPercent != null ? `${idealPercent}%` : null}
          />
          <ResultRow
            label="Body Fat to Lose to Reach Ideal"
            value={
              fatToLose != null && fatToLose > 0 ? `${fatToLose} ${massUnit}` : fatToLose === 0 ? `0 ${massUnit}` : null
            }
          />
          <ResultRow label="Body Fat (BMI method)" value={bmiPercent != null ? `${bmiPercent}%` : null} />
        </tbody>
      </table>
      {profileNote && (
        <p className="text-[10px] text-slate-500 px-3 py-2 border-t border-slate-100 bg-slate-50">Using profile: {profileNote}</p>
      )}
    </div>
  )
}
