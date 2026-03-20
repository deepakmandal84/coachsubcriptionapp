import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { packagesApi } from '../api'
import { PACKAGE_CATEGORIES, getThemeColorForCategory } from '../constants/categories'

export default function Packages() {
  const { refresh } = useAuth()
  const [list, setList] = useState([])
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)
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
    packagesApi.list().then(setList).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
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
      await refresh()
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
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
      await refresh()
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this package?')) return
    try {
      await packagesApi.delete(id)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Packages</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add package</button>
      </div>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <div className="space-y-3">
        <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
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
                    <button onClick={() => openEdit(p)} className="text-blue-600 mr-2 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {list.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border p-4 shadow-sm">
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
                <button onClick={() => openEdit(p)} className="flex-1 px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50">Edit</button>
                <button onClick={() => handleDelete(p.id)} className="flex-1 px-3 py-2 rounded-xl border border-red-100 text-red-700 bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{modal === 'create' ? 'New package' : 'Edit package'}</h2>
            <form onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full border rounded px-3 py-2" />
              </div>
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
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{modal === 'create' ? 'Create' : 'Save'}</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
