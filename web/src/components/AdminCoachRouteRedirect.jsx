import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { setActingTenantId } from '../hooks/useAppPaths'

/** Coaches use /students etc. Admins must use /academies/:tenantId/students. */
export default function AdminCoachRouteRedirect({ to = 'students', children }) {
  const { coach, loading } = useAuth()
  if (loading) return null
  if (coach?.role !== 'Admin') return children

  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('actingTenantId') : ''
  if (stored) {
    setActingTenantId(stored)
    return <Navigate to={`/academies/${stored}/${to}`} replace />
  }
  return <Navigate to="/admin" replace />
}
