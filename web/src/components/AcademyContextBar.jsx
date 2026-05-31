import { Link } from 'react-router-dom'
import { FiBriefcase } from 'react-icons/fi'
import Select from './ui/Select'
import Button from './ui/Button'
import { academyOwnerLine, academyPickerLabel, academyTitle } from '../utils/academyDisplay'

export default function AcademyContextBar({
  inAcademyContext,
  activeAcademy,
  adminAcademies,
  academyId,
  onSwitchAcademy,
}) {
  if (!inAcademyContext && adminAcademies.length === 0) return null

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand shrink-0">
            <FiBriefcase />
          </span>
          {inAcademyContext && activeAcademy ? (
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Managing academy</p>
              <p className="font-semibold text-slate-900 truncate">{academyTitle(activeAcademy)}</p>
              <p className="text-xs text-slate-500 truncate">{academyOwnerLine(activeAcademy)}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Select an academy to manage students, packages, and sessions.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Select
            aria-label="Switch academy"
            value={academyId || ''}
            onChange={(e) => onSwitchAcademy(e.target.value)}
            className="min-w-[200px] sm:min-w-[240px]"
          >
            <option value="">{inAcademyContext ? 'Leave academy…' : 'Open academy…'}</option>
            {adminAcademies.map((c) => (
              <option key={c.id} value={c.id}>
                {academyPickerLabel(c)}
              </option>
            ))}
          </Select>
          {inAcademyContext && (
            <Link to="/admin">
              <Button variant="secondary" size="sm">
                All academies
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
