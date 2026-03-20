import { useMemo, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { FiMenu, FiX } from 'react-icons/fi'

export default function Layout() {
  const { coach, logout } = useAuth()
  const primary = coach?.primaryColor || '#2563eb'
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = useMemo(() => {
    return [
      coach?.role === 'Admin' ? { to: '/admin', label: 'Super Admin', show: true } : { show: false },
      { to: '/', label: 'Dashboard', show: true },
      { to: '/students', label: 'Students', show: true },
      { to: '/packages', label: 'Packages', show: true },
      { to: '/subscriptions', label: 'Subscriptions', show: true },
      { to: '/sessions', label: 'Sessions', show: true },
      { to: '/settings', label: 'Settings', show: true },
    ].filter(x => x.show !== false)
  }, [coach?.role])

  function linkClass({ isActive }) {
    return `px-3 py-2 rounded ${isActive ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40" style={{ borderBottomColor: primary + '20' }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white"
              aria-label="Open menu"
            >
              <FiMenu className="text-lg" />
            </button>
            {coach?.logoUrl && <img src={coach.logoUrl} alt="" className="h-8" />}
            <span className="font-semibold text-lg truncate">{coach?.academyName || (coach?.role === 'Admin' ? 'Platform Admin' : 'Coach App')}</span>
            <nav className="hidden md:flex gap-1">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => linkClass({ isActive })}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-500">{coach?.email}</span>
            <button onClick={logout} className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50">Logout</button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl"
            style={{ borderRight: `1px solid ${primary}20` }}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b">
              <span className="font-semibold">{coach?.academyName || 'Menu'}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white"
                aria-label="Close menu"
              >
                <FiX className="text-lg" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {navLinks.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded ${isActive ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="pt-3 border-t mt-3">
                <div className="text-sm text-gray-500 mb-2">{coach?.email}</div>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full px-3 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
