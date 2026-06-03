import { FiActivity, FiCalendar, FiClipboard, FiCoffee, FiHome } from 'react-icons/fi'
import ParentPortalHome from '../components/parentPortal/ParentPortalHome'
import ParentPortalSchedule from '../components/parentPortal/ParentPortalSchedule'
import ParentPortalProgress from '../components/parentPortal/ParentPortalProgress'
import ParentPortalCheckIns from '../components/parentPortal/ParentPortalCheckIns'
import ParentPortalDiet from '../components/parentPortal/ParentPortalDiet'

/**
 * Client portal feature registry — add new entries here to expose more tabs.
 * Optional `enabled: (ctx) => boolean` gates features per tenant/student later.
 */
export const PARENT_PORTAL_FEATURES = [
  {
    id: 'home',
    label: 'Home',
    shortLabel: 'Home',
    icon: FiHome,
    component: ParentPortalHome,
  },
  {
    id: 'progress',
    label: 'My progress',
    shortLabel: 'Progress',
    icon: FiActivity,
    component: ParentPortalProgress,
  },
  {
    id: 'checkins',
    label: 'Check-ins',
    shortLabel: 'Check-ins',
    icon: FiClipboard,
    component: ParentPortalCheckIns,
  },
  {
    id: 'classes',
    label: 'Classes',
    shortLabel: 'Classes',
    icon: FiCalendar,
    component: ParentPortalSchedule,
  },
  {
    id: 'diet',
    label: 'Diet',
    shortLabel: 'Diet',
    icon: FiCoffee,
    component: ParentPortalDiet,
  },
  // Future examples (wire API + panel, then set enabled):
  // { id: 'payments', label: 'Payments', icon: FiCreditCard, component: ParentPortalPayments, enabled: () => false },
  // { id: 'messages', label: 'Messages', icon: FiMessageCircle, component: ParentPortalMessages },
]

export const DEFAULT_PARENT_PORTAL_TAB = 'home'

export function getParentPortalFeature(id) {
  return PARENT_PORTAL_FEATURES.find((f) => f.id === id)
}

export function getVisibleParentPortalFeatures(ctx = {}) {
  return PARENT_PORTAL_FEATURES.filter((f) => (f.enabled ? f.enabled(ctx) : true))
}
