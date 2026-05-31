import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { packagesApi } from '../api'
import { PACKAGE_CATEGORIES, getThemeColorForCategory } from '../constants/categories'
import { FiBox, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { formatError } from '../utils/formatError'

export default function Packages() {
  const { refresh } = useAuth()
  const toast = useToast()
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    price: 0,
    validityDays: 30,
    totalSessions: undefined,
    type: 'ClassPack',
    category: '',
    categoryOther: '',
  })

  function load() {
    packagesApi.list().then(setList).catch((e) => setErr(formatError(e)))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ name: '', price: 0, validityDays: 30, totalSessions: undefined, type: 'ClassPack', category: '', categoryOther: '' })
    setEditing(null)
    setModal('create')
  }

  function openEdit(p) {
    const isPredefined = PACKAGE_CATEGORIES.includes(p.category)
    setForm({
      name: p.name,
      price: p.price,
      validityDays: p.validityDays,
      totalSessions: p.totalSessions ?? undefined,
      type: p.type,
      category: isPredefined ? p.category : 'Other',
      categoryOther: isPredefined ? '' : (p.category || ''),
    })
    setEditing(p)
    setModal('edit')
  }

  function getCategoryValue() {
    return form.category === 'Other' ? (form.categoryOther || '').trim() : (form.category || '')
  }

  async function handleCreate(e) {
    e.preventDefault()
    const category = getCategoryValue()
    try {
      await packagesApi.create({
        name: form.name,
        price: form.price,
        validityDays: form.validityDays,
        totalSessions: form.type === 'MonthlyUnlimited' ? undefined : form.totalSessions,
        type: form.type,
        category: category || undefined,
      })
      setModal(null)
      toast.success('Package created')
      await refresh()
      load()
    } catch (e) { setErr(formatError(e)) }
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editing) return
    const category = getCategoryValue()
    try {
      await packagesApi.update(editing.id, {
        name: form.name,
        price: form.price,
        validityDays: form.validityDays,
        totalSessions: form.type === 'MonthlyUnlimited' ? undefined : form.totalSessions,
        type: form.type,
        category: category || undefined,
      })
      setModal(null)
      toast.success('Package updated')
      await refresh()
      load()
    } catch (e) { setErr(formatError(e)) }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleteBusy(true)
    try {
      await packagesApi.delete(deleteId)
      setDeleteId(null)
      toast.success('Package removed')
      load()
    } catch (e) {
      setErr(formatError(e))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={FiBox}
        title="Packages"
        description="Plans you sell — class packs, unlimited monthly, or drop-in."
        action={
          <Button onClick={openCreate}>
            <FiPlus />
            Add package
          </Button>
        }
      />
      {err && (
        <Alert variant="error" className="mb-4" onDismiss={() => setErr('')}>
          {err}
        </Alert>
      )}
      <div className="space-y-3">
        <Card padding={false} className="hidden md:block overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Validity (days)</th>
                <th className="text-left p-3">Sessions</th>
                <th className="text-left p-3">Type</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category ?? '—'}</td>
                  <td className="p-3">${p.price.toFixed(2)}</td>
                  <td className="p-3">{p.validityDays}</td>
                  <td className="p-3">{p.totalSessions ?? 'Unlimited'}</td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><FiEdit2 />Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteId(p.id)}><FiTrash2 />Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="md:hidden space-y-3">
          {list.map(p => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>Category: {p.category ?? '—'}</div>
                    <div>Price: ${p.price.toFixed(2)}</div>
                    <div>Validity: {p.validityDays} days</div>
                    <div>Sessions: {p.totalSessions ?? 'Unlimited'}</div>
                    <div>Type: {p.type}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(p)}><FiEdit2 />Edit</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-red-600" onClick={() => setDeleteId(p.id)}><FiTrash2 />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'New package' : 'Edit package'}
          onClose={() => setModal(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" form="package-form">{modal === 'create' ? 'Create' : 'Save'}</Button>
            </div>
          }
        >
            <form id="package-form" onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
              <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <div>
                <label className="block text-sm font-medium text-gray-700">Category (sets your white-label theme)</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, categoryOther: '' }))} className="w-full border rounded px-3 py-2">
                  <option value="">— Select —</option>
                  {PACKAGE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Other">Other (add your own)</option>
                </select>
                {form.category === 'Other' && (
                  <input
                    type="text"
                    placeholder="e.g. Basketball, Tennis"
                    value={form.categoryOther}
                    onChange={e => setForm(f => ({ ...f, categoryOther: e.target.value }))}
                    className="w-full border rounded px-3 py-2 mt-2"
                  />
                )}
                {form.category && form.category !== 'Other' && (
                  <p className="text-xs text-gray-500 mt-1">Theme color: <span className="font-mono" style={{ color: getThemeColorForCategory(form.category) }}>{getThemeColorForCategory(form.category)}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price *</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} required className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Validity (days) *</label>
                  <input type="number" min="1" value={form.validityDays} onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) }))} required className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded px-3 py-2">
                  <option value="ClassPack">Class pack</option>
                  <option value="MonthlyUnlimited">Monthly unlimited</option>
                  <option value="DropIn">Drop-in</option>
                </select>
              </div>
              {form.type !== 'MonthlyUnlimited' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total sessions</label>
                  <input type="number" min="1" value={form.totalSessions ?? ''} onChange={e => setForm(f => ({ ...f, totalSessions: e.target.value ? Number(e.target.value) : undefined }))} className="w-full border rounded px-3 py-2" />
                </div>
              )}
            </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete package?"
        description="Subscriptions using this package are not affected, but you cannot sell it again."
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
