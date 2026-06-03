import { FiTrendingUp } from 'react-icons/fi'
import { useParentProgress } from '../../context/ParentProgressContext'
import ProgressLineChart from '../ProgressLineChart'
import Button from '../ui/Button'
import { lengthLabel, weightLabel } from '../../utils/progressUnits'

export default function ParentProgressTrends({ onLogCheckIn }) {
  const { summary, loading } = useParentProgress()
  const chart = summary?.chart
  const unit = chart?.measurementUnit || summary?.profile?.measurementUnit || 'Imperial'

  if (loading && !summary) {
    return <p className="text-slate-500 text-center py-10 animate-pulse text-sm">Loading charts…</p>
  }

  const series = [
    { key: 'weight', title: weightLabel(unit), points: chart?.weight, color: 'bg-teal-600', suffix: unit === 'Imperial' ? ' lb' : ' kg' },
    { key: 'bodyFat', title: 'Body fat %', points: chart?.bodyFat, color: 'bg-amber-500', suffix: '%', decimals: 1 },
    { key: 'waist', title: `Waist (${lengthLabel(unit)})`, points: chart?.waist, color: 'bg-violet-500', suffix: unit === 'Imperial' ? ' in' : ' cm' },
    { key: 'hips', title: `Hips (${lengthLabel(unit)})`, points: chart?.hips, color: 'bg-rose-500', suffix: unit === 'Imperial' ? ' in' : ' cm' },
    { key: 'chest', title: `Chest (${lengthLabel(unit)})`, points: chart?.chest, color: 'bg-sky-600', suffix: unit === 'Imperial' ? ' in' : ' cm' },
  ].filter((s) => (s.points?.length ?? 0) > 0)

  const hasAny = series.length > 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        Line graphs built from each check-in — tap a point to see the date and value.
      </p>

      {series.map((s) => (
        <ProgressLineChart
          key={s.key}
          title={s.title}
          points={s.points}
          color={s.color}
          icon={FiTrendingUp}
          valueSuffix={s.suffix}
          decimals={s.decimals ?? 1}
        />
      ))}

      {!hasAny && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
          <p className="text-sm text-slate-600">Log at least one check-in to see your trends.</p>
          <Button className="mt-4" onClick={onLogCheckIn}>
            Log check-in
          </Button>
        </div>
      )}
    </div>
  )
}
