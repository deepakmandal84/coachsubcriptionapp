import { useMemo } from 'react'
import { useAuth } from '../AuthContext'
import { useAppPaths } from './useAppPaths'

/** Coach owner/staff or Super Admin managing an academy via /academies/:id. */
export function useAcademyPermissions() {
  const { coach } = useAuth()
  const paths = useAppPaths()

  return useMemo(() => {
    const adminActing = paths.isAdminManagingAcademy

    const canManageStudents =
      adminActing ||
      (coach?.role === 'Coach' && (coach?.clubTenantId == null || coach?.canManageStudents === true))

    const canManageSessions =
      adminActing ||
      (coach?.role === 'Coach' && (coach?.clubTenantId == null || coach?.canCreateSessions === true))

    return { adminActing, canManageStudents, canManageSessions }
  }, [coach, paths.isAdminManagingAcademy])
}
