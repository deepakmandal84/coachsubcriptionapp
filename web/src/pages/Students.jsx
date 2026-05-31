import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { studentsApi } from '../api'
import { useAuth } from '../AuthContext'
import { useAcademyPermissions } from '../hooks/useAcademyPermissions'
import { useAppPaths } from '../hooks/useAppPaths'
import { FiActivity, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUser } from 'react-icons/fi'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { TableSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../context/ToastContext'
import { formatError } from '../utils/formatError'

export default function Students() {
  const { coach } = useAuth()
  const paths = useAppPaths()
  const { canManageStudents } = useAcademyPermissions()
  const toast = useToast()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    parentName: '',
    email: '',
    phone: '',
    notes: '',
    tags: '',
    status: 'Active',
    gender: 'Unspecified',
    height: '',
    dateOfBirth: '',
  })
  const loadVersionRef = useRef(0)

  function load() {
    const version = ++loadVersionRef.current
    setLoading(true)
    studentsApi
      .list({ search: search || undefined, status: status || undefined })
      .then((data) => {
        if (version === loadVersionRef.current) setList(data)
      })
      .catch((e) => {
        if (version === loadVersionRef.current) setErr(formatError(e))
      })
      .finally(() => {
        if (version === loadVersionRef.current) setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [search, status])

  function openCreate() {
    setForm({ name: '', parentName: '', email: '', phone: '', notes: '', tags: '', status: 'Active', gender: 'Unspecified', height: '', dateOfBirth: '' })
    setEditing(null)
    setModal('create')
  }

  function openEdit(s) {
    setForm({
      name: s.name,
      parentName: s.parentName ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      notes: s.notes ?? '',
      tags: s.tags ?? '',
      status: s.status,
      gender: s.gender ?? 'Unspecified',
      height: s.height != null ? String(s.height) : '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
    })
    setEditing(s)
    setModal('edit')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setErr('')
    try {
      const payload = {
        name: form.name.trim(),
        parentName: form.parentName?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        notes: form.notes?.trim() || null,
        tags: form.tags?.trim() || null,
        status: form.status,
        gender: form.gender,
        height: form.height === '' ? null : Number(form.height),
        dateOfBirth: form.dateOfBirth || null,
      }
      await studentsApi.create(payload)
      setModal(null)
      toast.success('Student added')
      load()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    try {
      await studentsApi.update(editing.id, {
        ...form,
        height: form.height === '' ? null : Number(form.height),
        dateOfBirth: form.dateOfBirth || null,
      })
      setModal(null)
      toast.success('Student updated')
      load()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await studentsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Student removed')
      load()
    } catch (e) {
      setErr(formatError(e))
    } finally {
      setDeleteBusy(false)
    }
  }

  const statusVariant = (s) => (s === 'Active' ? 'success' : s === 'Trial' ? 'warning' : 'default')

  return (
    <div>
      <PageHeader
        icon={FiUser}
        title="Students"
        description="Roster for your academy — link students to subscriptions and attendance."
        action={
          canManageStudents ? (
            <Button onClick={openCreate}>
              <FiPlus />
              Add student
            </Button>
          ) : null
        }
      />

      {!canManageStudents && coach?.role === 'Coach' && (
        <Alert variant="info" className="mb-4">
          View only — your role can browse students but not add or edit them.
        </Alert>
      )}

      {err && (
        <Alert variant="error" className="mb-4" onDismiss={() => setErr('')}>
          {err}
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name, email, parent…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus-brand focus:outline-none"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Trial">Trial</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiUser}
            title="No students yet"
            description="Add your first student to start selling packages and tracking attendance."
            actionLabel={canManageStudents ? 'Add student' : undefined}
            onAction={canManageStudents ? openCreate : undefined}
          />
        </Card>
      ) : (
        <>
          <Card padding={false} className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">Name</th>
                  <th className="text-left p-3 font-medium text-slate-600">Parent</th>
                  <th className="text-left p-3 font-medium text-slate-600">Contact</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                  <th className="text-right p-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.parentName ?? '–'}</td>
                    <td className="p-3 text-slate-600 text-xs">
                      {s.email && <div>{s.email}</div>}
                      {s.phone && <div>{s.phone}</div>}
                      {!s.email && !s.phone && '–'}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex flex-wrap gap-2 justify-end">
                        <Link to={paths.studentProgress(s.id)}>
                          <Button variant="ghost" size="sm">
                            <FiActivity />
                            Progress
                          </Button>
                        </Link>
                        {canManageStudents ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                              <FiEdit2 />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(s)}>
                              <FiTrash2 />
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="md:hidden space-y-3">
            {list.map((s) => (
              <Card key={s.id}>
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{s.parentName || 'No parent listed'}</div>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </div>
                {(s.email || s.phone) && (
                  <p className="text-sm text-slate-600 mt-2">
                    {s.email}
                    {s.email && s.phone ? ' · ' : ''}
                    {s.phone}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Link to={paths.studentProgress(s.id)} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <FiActivity />
                      Progress
                    </Button>
                  </Link>
                  {canManageStudents && (
                    <>
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 text-red-600" onClick={() => setDeleteTarget(s)}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {modal && (
        <Modal
          title={modal === 'create' ? 'New student' : 'Edit student'}
          onClose={() => setModal(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" form="student-form">
                {modal === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          }
        >
          <form id="student-form" onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
            <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Parent name" value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus-brand focus:outline-none"
                rows={2}
              />
            </div>
            <Input label="Tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. group A, beginner" />
            <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
              <option value="Inactive">Inactive</option>
            </Select>
            <p className="text-sm font-medium text-slate-700 pt-2">Progress / body fat profile</p>
            <Select label="Gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              <option value="Unspecified">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Height (cm or in per student unit)"
                type="number"
                step="0.1"
                min="0"
                value={form.height}
                onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete student?"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name} from your roster. This cannot be undone if they have no linked records.`
            : ''
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
