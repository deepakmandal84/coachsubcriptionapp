import { useEffect, useState } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { adminApi } from '../api'
import { setActingTenantId } from '../hooks/useAppPaths'

/** Syncs acting tenant from URL and ensures the id is a valid academy (owner) tenant. */
export default function ClubTenantGate() {
  const { coach, loading } = useAuth()
  const { tenantId } = useParams()
  const [valid, setValid] = useState(null)

  useEffect(() => {
    if (loading || coach?.role !== 'Admin' || !tenantId) return
    setActingTenantId(tenantId)
    adminApi
      .listAcademySummaries()
      .then((list) => setValid((list ?? []).some((c) => c.id === tenantId)))
      .catch(() => setValid(false))
  }, [loading, coach?.role, tenantId])

  if (loading) return <p className="text-gray-500">Loading…</p>
  if (coach?.role !== 'Admin') return <Navigate to="/" replace />
  if (valid === false) return <Navigate to="/admin" replace />
  if (valid === null) return <p className="text-gray-500">Loading club…</p>
  return <Outlet />
}
