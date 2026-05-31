import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { adminApi } from '../api'
import { useAppPaths } from '../hooks/useAppPaths'
import AcademySummaryCard from '../components/AcademySummaryCard'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import { useToast } from '../context/ToastContext'
import { formatError } from '../utils/formatError'

export default function AdminDashboard() {
  const { coach } = useAuth()
  const paths = useAppPaths()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [onboard, setOnboard] = useState({ academyName: '', email: '', password: '', ownerName: '' })
  const [onboardBusy, setOnboardBusy] = useState(false)

  function reload() {
    adminApi.dashboard().then(setData).catch((e) => setErr(formatError(e)))
  }

  useEffect(() => {
    if (coach?.role !== 'Admin') return
    reload()
  }, [coach?.role])

  async function submitOnboard(e) {
    e.preventDefault()
    setErr('')
    setOnboardBusy(true)
    try {
      const row = await adminApi.onboardAcademy({
        academyName: onboard.academyName.trim(),
        email: onboard.email.trim(),
        password: onboard.password,
        ownerName: onboard.ownerName.trim() || undefined,
      })
      toast.success(`Academy “${row.academyName || row.name}” created`)
      setOnboard({ academyName: '', email: '', password: '', ownerName: '' })
      reload()
    } catch (ex) {
      setErr(formatError(ex))
    } finally {
      setOnboardBusy(false)
    }
  }

  if (err && !data) return <Alert variant="error">{err}</Alert>
  if (!data) {
    return (
      <div>
        <PageHeader title="Academies" description="Platform administration" />
        <div className="h-40 animate-pulse bg-slate-200 rounded-xl" />
      </div>
    )
  }
  if (coach?.role !== 'Admin') return <Alert variant="warning">Access denied. Admin only.</Alert>

  const academies = data.academies ?? []

  return (
    <div>
      <PageHeader
        title="Academies"
        description="Each academy is one tenant. Coaches belong to an academy — open Manage to work with their data."
      />

      <Card className="mb-8">
        <h2 className="font-semibold text-slate-900 mb-1">Onboard new academy</h2>
        <p className="text-sm text-slate-500 mb-4">Creates the owner account. Share the email and password with them.</p>
        {err && (
          <Alert variant="error" className="mb-4" onDismiss={() => setErr('')}>
            {err}
          </Alert>
        )}
        <form onSubmit={submitOnboard} className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          <Input
            className="sm:col-span-2"
            label="Academy name *"
            value={onboard.academyName}
            onChange={(e) => setOnboard((o) => ({ ...o, academyName: e.target.value }))}
            required
            placeholder="e.g. North Shore Dance Studio"
          />
          <Input label="Owner email *" type="email" value={onboard.email} onChange={(e) => setOnboard((o) => ({ ...o, email: e.target.value }))} required />
          <Input
            label="Owner password *"
            type="password"
            autoComplete="new-password"
            value={onboard.password}
            onChange={(e) => setOnboard((o) => ({ ...o, password: e.target.value }))}
            required
          />
          <Input
            className="sm:col-span-2"
            label="Owner display name (optional)"
            value={onboard.ownerName}
            onChange={(e) => setOnboard((o) => ({ ...o, ownerName: e.target.value }))}
            placeholder="Defaults to academy name"
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={onboardBusy}>
              {onboardBusy ? 'Creating…' : 'Create academy'}
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-sm font-medium text-slate-700 mb-4">
        {data.totalAcademies ?? academies.length} {academies.length === 1 ? 'academy' : 'academies'}
      </p>

      {academies.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-center py-8">No academies yet. Onboard one above.</p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-4">
          {academies.map((a) => (
            <AcademySummaryCard
              key={a.id}
              academy={a}
              manageHref={paths.manageAcademy(a.id)}
              detailsHref={`/admin/academies/${a.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
