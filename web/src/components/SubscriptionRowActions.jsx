import {
  FiBell,
  FiCheckCircle,
  FiCreditCard,
  FiLink2,
  FiRefreshCw,
} from 'react-icons/fi'
import { FaHistory } from 'react-icons/fa'
import Button from './ui/Button'
import RowActionsMenu from './RowActionsMenu'

/** Desktop: primary action + overflow menu. Mobile: same pattern in card footer. */
export default function SubscriptionRowActions({
  sub,
  onMarkPaid,
  onRemind,
  onParentLink,
  onConfirmRenewal,
  onRenewalHistory,
  compact,
}) {
  const items = [
    {
      key: 'paid',
      label: 'Mark paid',
      icon: FiCreditCard,
      onClick: onMarkPaid,
      hidden: sub.paymentStatus !== 'Due',
    },
    {
      key: 'remind',
      label: 'Send reminder',
      icon: FiBell,
      onClick: onRemind,
    },
    {
      key: 'link',
      label: 'Parent portal link',
      icon: FiLink2,
      onClick: onParentLink,
    },
    {
      key: 'renew',
      label: 'Confirm renewal',
      icon: FiRefreshCw,
      onClick: onConfirmRenewal,
      disabled: !sub.hasPendingRenewal,
    },
    {
      key: 'history',
      label: 'Renewal history',
      icon: FaHistory,
      onClick: onRenewalHistory,
    },
  ]

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 pt-3">
        {sub.paymentStatus === 'Due' && (
          <Button variant="secondary" size="sm" className="flex-1 min-w-[120px]" onClick={onMarkPaid}>
            <FiCreditCard />
            Mark paid
          </Button>
        )}
        <RowActionsMenu items={items} label={`Actions for ${sub.studentName}`} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {sub.paymentStatus === 'Due' && (
        <Button variant="primary" size="sm" onClick={onMarkPaid}>
          <FiCreditCard />
          Mark paid
        </Button>
      )}
      {sub.hasPendingRenewal && (
        <Button variant="secondary" size="sm" className="border-amber-200 text-amber-800 bg-amber-50" onClick={onConfirmRenewal}>
          <FiCheckCircle />
          Confirm renewal
        </Button>
      )}
      <RowActionsMenu items={items} label={`Actions for ${sub.studentName}`} />
    </div>
  )
}
