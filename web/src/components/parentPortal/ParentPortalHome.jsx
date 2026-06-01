import { FiUser } from 'react-icons/fi'
import Badge from '../ui/Badge'
import { useParentPortal } from '../../context/ParentPortalContext'
import { formatClassUsage } from '../../utils/classUsage'

export default function ParentPortalHome() {
  const { data, primary, requestRenewal, requesting, requestSent } = useParentPortal()

  const paymentDue = data.paymentStatus === 'Due'

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-semibold"
            style={{ backgroundColor: primary }}
          >
            {data.studentName?.charAt(0)?.toUpperCase() || <FiUser />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your profile</p>
            <h2 className="text-lg font-semibold text-slate-900 truncate">{data.studentName}</h2>
            {data.classUsage && (
              <p className="text-sm text-slate-600 mt-1">{formatClassUsage(data.classUsage)}</p>
            )}
          </div>
        </div>
      </section>

      {(data.packageName || data.expiryDate || data.paymentStatus) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900">Membership</h3>
          {data.packageName && (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-slate-500">Package</span>
              <span className="font-medium text-slate-900 text-right">{data.packageName}</span>
            </div>
          )}
          {data.remainingSessions != null && (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-slate-500">Sessions left</span>
              <span className="font-medium tabular-nums">{data.remainingSessions}</span>
            </div>
          )}
          {data.expiryDate && (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-slate-500">Expires</span>
              <span className="font-medium">{new Date(data.expiryDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center gap-2 text-sm pt-1 border-t border-slate-100">
            <span className="text-slate-500">Payment</span>
            <Badge variant={paymentDue ? 'warning' : 'success'}>{data.paymentStatus || '—'}</Badge>
          </div>
          {paymentDue && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Payment is due — your coach will follow up. You can also ask them to send a reminder.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-1">Renew membership</h3>
        <p className="text-sm text-slate-500 mb-4">Notify your coach when you are ready to renew.</p>
        <button
          type="button"
          onClick={requestRenewal}
          disabled={requesting || requestSent}
          className="w-full py-2.5 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition hover:opacity-95"
          style={{ backgroundColor: primary }}
        >
          {requestSent ? 'Renewal request sent' : requesting ? 'Sending…' : 'Request renewal'}
        </button>
      </section>
    </div>
  )
}
