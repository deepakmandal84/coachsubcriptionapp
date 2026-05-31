import { Link } from 'react-router-dom'
import { academyOwnerLine, academyTitle } from '../utils/academyDisplay'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Card from './ui/Card'

/**
 * Compact academy card for Super Admin lists.
 * @param {object} academy — AdminAcademyDto from /api/admin/dashboard
 * @param {string} manageHref — e.g. /academies/:id/students
 * @param {string} detailsHref — e.g. /admin/academies/:id
 */
export default function AcademySummaryCard({ academy, manageHref, detailsHref }) {
  const staffCount = academy.staffCount ?? academy.staff?.length ?? 0
  const coachCount = 1 + staffCount

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col gap-3 max-w-sm w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{academyTitle(academy)}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5" title={academyOwnerLine(academy)}>
            {academyOwnerLine(academy)}
          </p>
        </div>
        <Badge variant={academy.isActive ? 'success' : 'danger'}>{academy.isActive ? 'Active' : 'Inactive'}</Badge>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-50 py-2 px-1">
          <dt className="text-[10px] uppercase tracking-wide text-gray-500">Students</dt>
          <dd className="font-semibold text-gray-900 tabular-nums">{academy.studentCount}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 py-2 px-1">
          <dt className="text-[10px] uppercase tracking-wide text-gray-500">Subs</dt>
          <dd className="font-semibold text-gray-900 tabular-nums">{academy.activeSubscriptionCount}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 py-2 px-1">
          <dt className="text-[10px] uppercase tracking-wide text-gray-500">Coaches</dt>
          <dd className="font-semibold text-gray-900 tabular-nums">{coachCount}</dd>
        </div>
      </dl>

      {staffCount > 0 && (
        <p className="text-xs text-gray-500">
          Owner + {staffCount} staff · joined {new Date(academy.createdAt).toLocaleDateString()}
        </p>
      )}
      {staffCount === 0 && (
        <p className="text-xs text-gray-500">Joined {new Date(academy.createdAt).toLocaleDateString()}</p>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        <Link to={manageHref} className="flex-1">
          <Button className="w-full">Manage academy</Button>
        </Link>
        <Link to={detailsHref}>
          <Button variant="secondary">Details</Button>
        </Link>
      </div>
    </Card>
  )
}
