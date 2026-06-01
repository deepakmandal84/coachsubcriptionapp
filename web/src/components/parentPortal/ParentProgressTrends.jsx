import { FiTrendingUp } from 'react-icons/fi'
import { useParentProgress } from '../../context/ParentProgressContext'
import ProgressLineChart from '../ProgressLineChart'
import Button from '../ui/Button'
import { weightLabel } from '../../utils/progressUnits'

export default function ParentProgressTrends({ onLogCheckIn }) {
  const { summary, loading } = useParentProgress()
  const chart = summary?.chart

  if (loading && !summary) {
    return <p className="text-slate-500 text-center py-10 animate-pulse text-sm">Loading charts…</p>
  }

  const hasAny = (chart?.weight?.length ?? 0) > 0 || (chart?.bodyFat?.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        Track how your weight and body fat change over time. Each bar is one check-in.
      </p>

      <ProgressLineChart
        title={chart?.measurementUnit ? weightLabel(chart.measurementUnit) : 'Weight'}
        points={chart?.weight}
        color="bg-teal-600"
        icon={FiTrendingUp}
      />

      <ProgressLineChart title="Body fat %" points={chart?.bodyFat} color="bg-amber-500" icon={FiTrendingUp} />

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
