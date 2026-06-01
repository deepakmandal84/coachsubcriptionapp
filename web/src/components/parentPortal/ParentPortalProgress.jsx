import { useSearchParams } from 'react-router-dom'
import { parentApi } from '../../api'
import { useParentPortal } from '../../context/ParentPortalContext'
import { useParentProgress } from '../../context/ParentProgressContext'
import { formatError } from '../../utils/formatError'
import ParentProgressDashboard from './ParentProgressDashboard'
import ParentProgressTrends from './ParentProgressTrends'
import CheckInFormModal from './CheckInFormModal'
import Select from '../ui/Select'
import { useToast } from '../../context/ToastContext'

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
]

function ProgressSubNav({ active, onChange, primary }) {
  return (
    <div className="flex rounded-xl bg-slate-100/90 p-1 border border-slate-200/60" role="tablist" aria-label="Progress views">
      {VIEWS.map((v) => {
        const isActive = active === v.id
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(v.id)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
              isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
            style={isActive ? { color: primary } : undefined}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ParentPortalProgress() {
  const { data, primary } = useParentPortal()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'trends' ? 'trends' : 'overview'

  const {
    token,
    profile,
    unit,
    loading,
    checkInOpen,
    openCheckIn,
    closeCheckIn,
    reload,
  } = useParentProgress()

  function setView(next) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'progress')
    if (next === 'overview') params.delete('view')
    else params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  async function handleUnitChange(next) {
    try {
      await parentApi.setMeasurementUnit(token, next)
      reload()
    } catch (e) {
      toast.error(formatError(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">My progress</p>
          <h2 className="text-xl font-semibold text-slate-900 truncate mt-0.5">{data.studentName}</h2>
        </div>
        <Select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="w-[7.25rem] shrink-0 text-xs py-2 bg-white border-slate-200"
          aria-label="Units"
          disabled={loading}
        >
          <option value="Imperial">lb / in</option>
          <option value="Metric">kg / cm</option>
        </Select>
      </div>

      <ProgressSubNav active={view} onChange={setView} primary={primary} />

      {view === 'overview' ? <ParentProgressDashboard onLogCheckIn={openCheckIn} /> : <ParentProgressTrends onLogCheckIn={openCheckIn} />}

      <CheckInFormModal
        open={checkInOpen}
        onClose={closeCheckIn}
        token={token}
        unit={unit}
        profile={profile}
        onSaved={() => {
          toast.success('Check-in saved')
          reload()
        }}
      />
    </div>
  )
}
