import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'

/** Academy tenant id from /academies/:tenantId/... or legacy /clubs/:tenantId/... */
export function academyIdFromPathname(pathname) {
  const m = pathname.match(/^\/(?:academies|clubs)\/([^/]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export function setActingTenantId(tenantId) {
  if (typeof localStorage === 'undefined') return
  if (tenantId) localStorage.setItem('actingTenantId', tenantId)
  else localStorage.removeItem('actingTenantId')
}

/** Paths for coach UI or Super Admin managing a specific academy (tenant). */
export function useAppPaths() {
  const { coach } = useAuth()
  const { tenantId: paramTenantId } = useParams()
  const { pathname } = useLocation()

  return useMemo(() => {
    const academyId = paramTenantId ?? academyIdFromPathname(pathname)
    const isAdminManagingAcademy = coach?.role === 'Admin' && !!academyId
    const base = isAdminManagingAcademy ? `/academies/${academyId}` : ''

    return {
      academyId,
      /** @deprecated use academyId */
      clubId: academyId,
      base,
      isAdminManagingAcademy,
      /** @deprecated use isAdminManagingAcademy */
      isAdminManagingClub: isAdminManagingAcademy,
      dashboard: `${base}/dashboard`,
      students: `${base}/students`,
      studentProgress: (id) => `${base}/students/${id}/progress`,
      packages: `${base}/packages`,
      subscriptions: `${base}/subscriptions`,
      sessions: `${base}/sessions`,
      settings: `${base}/settings`,
      sessionAttendance: (sessionId) => `${base}/sessions/${sessionId}/attendance`,
      manageAcademy: (id) => `/academies/${id}/students`,
      /** @deprecated use manageAcademy */
      manageClub: (id) => `/academies/${id}/students`,
    }
  }, [coach?.role, paramTenantId, pathname])
}
