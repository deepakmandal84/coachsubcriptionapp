import { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  FiBarChart2,
  FiBox,
  FiCalendar,
  FiCreditCard,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiShield,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useAuth } from './AuthContext'
import { adminApi } from './api'
import { setActingTenantId, useAppPaths } from './hooks/useAppPaths'
import { useBrandTheme } from './hooks/useBrandTheme'
import AcademyContextBar from './components/AcademyContextBar'
import Button from './components/ui/Button'

const ICONS = {
  admin: FiShield,
  dashboard: FiGrid,
  students: FiUsers,
  packages: FiBox,
  subscriptions: FiCreditCard,
  sessions: FiCalendar,
  settings: FiSettings,
  insights: FiBarChart2,
}

function NavItem({ to, label, iconKey, end, onNavigate }) {
  const Icon = ICONS[iconKey] || FiGrid
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
    >
      <Icon className="text-lg shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { coach, logout } = useAuth()
  const { tenantId } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const paths = useAppPaths()
  useBrandTheme(coach?.primaryColor)

  const [mobileNav, setMobileNav] = useState(false)
  const [adminAcademies, setAdminAcademies] = useState([])

  const isAdmin = coach?.role === 'Admin'
  const isStaffCoach = coach?.role === 'Coach' && !!coach?.clubTenantId
  const inAcademyContext = isAdmin && paths.isAdminManagingAcademy

  useEffect(() => {
    if (!isAdmin) return
    adminApi.listAcademies().then((list) => setAdminAcademies(list ?? [])).catch(() => setAdminAcademies([]))
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin && tenantId) setActingTenantId(tenantId)
  }, [isAdmin, tenantId])

  useEffect(() => setMobileNav(false), [pathname])

  const activeAcademy = useMemo(
    () => adminAcademies.find((c) => c.id === paths.academyId),
    [adminAcademies, paths.academyId]
  )

  function switchAcademy(academyOwnerId) {
    if (!academyOwnerId) {
      setActingTenantId(null)
      navigate('/admin')
      return
    }
    setActingTenantId(academyOwnerId)
    const segment = pathname.split('/').pop() || 'students'
    const allowed = ['dashboard', 'students', 'packages', 'subscriptions', 'sessions', 'settings']
    const page = allowed.includes(segment) ? segment : 'students'
    navigate(`/academies/${academyOwnerId}/${page}`)
  }

  const navLinks = useMemo(() => {
    if (isAdmin && !inAcademyContext) {
      return [{ to: '/admin', label: 'Academies', iconKey: 'admin', end: true }]
    }
    if (isAdmin && inAcademyContext) {
      return [
        { to: paths.dashboard, label: 'Dashboard', iconKey: 'dashboard' },
        { to: paths.students, label: 'Students', iconKey: 'students' },
        { to: paths.packages, label: 'Packages', iconKey: 'packages' },
        { to: paths.subscriptions, label: 'Subscriptions', iconKey: 'subscriptions' },
        { to: `${paths.subscriptions}?tab=insights`, label: 'Insights', iconKey: 'insights' },
        { to: paths.sessions, label: 'Sessions', iconKey: 'sessions' },
        { to: paths.settings, label: 'Settings', iconKey: 'settings' },
      ]
    }
    return [
      { to: '/', label: 'Dashboard', iconKey: 'dashboard', show: !isStaffCoach },
      { to: '/students', label: 'Students', iconKey: 'students', show: true },
      { to: '/packages', label: 'Packages', iconKey: 'packages', show: !isStaffCoach },
      { to: '/subscriptions', label: 'Subscriptions', iconKey: 'subscriptions', show: !isStaffCoach },
      { to: '/subscriptions?tab=insights', label: 'Insights', iconKey: 'insights', show: !isStaffCoach },
      { to: '/sessions', label: 'Sessions', iconKey: 'sessions', show: true },
      { to: '/settings', label: 'Settings', iconKey: 'settings', show: !isStaffCoach },
    ].filter((x) => x.show !== false)
  }, [isAdmin, inAcademyContext, isStaffCoach, paths])

  const brandTitle =
    inAcademyContext && activeAcademy
      ? activeAcademy.academyName || activeAcademy.name
      : coach?.academyName || (isAdmin ? 'Coach Subscription' : 'My academy')

  const sidebar = (
    <aside className="flex flex-col w-64 shrink-0 border-r border-slate-200 bg-white h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-100 shrink-0">
        {coach?.logoUrl ? (
          <img src={coach.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span className="h-8 w-8 rounded-lg btn-brand text-white text-sm font-bold flex items-center justify-center">
            {brandTitle.charAt(0)}
          </span>
        )}
        <span className="font-semibold text-slate-900 truncate text-sm">{brandTitle}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navLinks.map((l) => (
          <NavItem key={l.to + l.label} {...l} onNavigate={() => setMobileNav(false)} />
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100 shrink-0">
        <p className="text-xs text-slate-500 truncate px-3 mb-2">{coach?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="nav-link w-full text-slate-600"
        >
          <FiLogOut className="text-lg" />
          Log out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-30">{sidebar}</div>

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileNav(false)} aria-hidden="true" />
          <div className="relative h-full shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-slate-200"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <FiMenu />
          </button>
          <span className="lg:hidden font-semibold text-slate-900 truncate text-sm flex-1 mx-2">{brandTitle}</span>
          <span className="hidden lg:block text-sm text-slate-500">
            {isAdmin && !inAcademyContext ? 'Platform admin' : 'Academy workspace'}
          </span>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={logout}>
            Log out
          </Button>
        </header>

        {isAdmin && (
          <AcademyContextBar
            inAcademyContext={inAcademyContext}
            activeAcademy={activeAcademy}
            adminAcademies={adminAcademies}
            academyId={paths.academyId}
            onSwitchAcademy={switchAcademy}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
