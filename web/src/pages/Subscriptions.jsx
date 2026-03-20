import { useEffect, useState } from 'react'
import { subscriptionsApi, studentsApi, packagesApi, messageLogsApi } from '../api'
import { FiBell, FiClock, FiCreditCard, FiLink2, FiPlus, FiX } from 'react-icons/fi'
import LinkShare from '../components/LinkShare'

const REMINDER_TEMPLATES = 'PaymentDue,PackageExpiring,RequestRenewal'

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState('subscriptions')
  const [list, setList] = useState([])
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [reminderHistory, setReminderHistory] = useState([])
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ studentId: '', packageId: '', startDate: new Date().toISOString().slice(0, 10), paymentStatus: 'Due', paymentMethod: 'Cash' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Cash', notes: '' })
  const [parentLinkUrl, setParentLinkUrl] = useState('')

  function load() {
    subscriptionsApi.list().then(setList).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
    studentsApi.list().then(setStudents).catch(() => {})
    packagesApi.list().then(setPackages).catch(() => {})
  }

  function loadReminderHistory() {
    messageLogsApi.list({ template: REMINDER_TEMPLATES }).then(setReminderHistory).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (activeTab === 'history') loadReminderHistory() }, [activeTab])

  function openCreate() {
    setForm({ studentId: students[0]?.id ?? '', packageId: packages[0]?.id ?? '', startDate: new Date().toISOString().slice(0, 10), paymentStatus: 'Due', paymentMethod: 'Cash' })
    setModal('create')
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await subscriptionsApi.create({
        studentId: form.studentId,
        packageId: form.packageId,
        startDate: form.startDate,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
      })
      setModal(null)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  function openPayment(sub) {
    setSelected(sub)
    setPaymentForm({ amount: 0, method: 'Cash', notes: '' })
    setModal('payment')
  }

  async function handlePayment(e) {
    e.preventDefault()
    if (!selected) return
    try {
      await subscriptionsApi.recordPayment(selected.id, paymentForm)
      setModal(null)
      setSelected(null)
      load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function sendReminder(sub) {
    try {
      setErr('')
      setSuccessMsg('')
      await subscriptionsApi.sendReminder(sub.id)
      load()
      if (activeTab === 'history') loadReminderHistory()
      setModal('reminderSuccess')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  async function getParentLink(sub) {
    try {
      const res = await subscriptionsApi.getParentLink(sub.studentId, sub.id)
      setParentLinkUrl(res.url)
      setSelected(sub)
      setModal('link')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-violet-100 text-violet-700">
            <FiCreditCard />
          </span>
          Subscriptions
        </h1>
        {activeTab === 'subscriptions' && (
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 inline-flex items-center gap-2 shadow-sm"><FiPlus />New subscription</button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'subscriptions' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <FiCreditCard />
          Subscriptions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t inline-flex items-center gap-2 ${activeTab === 'history' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          <FiClock />
          Reminder history
        </button>
      </div>

      {err && <p className="text-red-600 mb-2">{err}</p>}
      {successMsg && <p className="text-green-600 mb-2">{successMsg}</p>}

      {modal === 'reminderSuccess' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <p className="text-green-600 font-semibold text-lg mb-2">Email sent successfully</p>
            <p className="text-gray-600 text-sm mb-4">The reminder has been sent to the student.</p>
            <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">OK</button>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-3">
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Student</th>
                  <th className="text-left p-3">Package</th>
                  <th className="text-left p-3">Expiry</th>
                  <th className="text-left p-3">Remaining</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3">{s.studentName}</td>
                    <td className="p-3">{s.packageName}</td>
                    <td className="p-3">{new Date(s.expiryDate).toLocaleDateString()}</td>
                    <td className="p-3">{s.remainingSessions ?? '–'}</td>
                    <td className="p-3">
                      <span className={s.paymentStatus === 'Due' ? 'text-amber-600 font-medium' : ''}>{s.paymentStatus}</span>
                      {s.paymentStatus === 'Due' && (
                        <button onClick={() => openPayment(s)} className="ml-2 text-blue-600 text-sm hover:underline inline-flex items-center gap-1"><FiCreditCard />Mark paid</button>
                      )}
                    </td>
                    <td className="p-3">
                      <button onClick={() => sendReminder(s)} className="text-blue-600 text-sm mr-3 hover:underline inline-flex items-center gap-1"><FiBell />Remind</button>
                      <button onClick={() => getParentLink(s)} className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1"><FiLink2 />Parent link</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {list.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.studentName}</div>
                    <div className="text-sm text-gray-600 mt-1">{s.packageName}</div>
                  </div>
                  <div className="text-sm">
                    {s.paymentStatus === 'Due' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 font-medium">
                        Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-100 font-medium">
                        Paid
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div>Expiry: {new Date(s.expiryDate).toLocaleDateString()}</div>
                  <div>Remaining: {s.remainingSessions ?? '–'}</div>
                </div>
                <div className="flex flex-wrap gap-2 pt-3">
                  {s.paymentStatus === 'Due' && (
                    <button onClick={() => openPayment(s)} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50 text-sm inline-flex items-center justify-center gap-1">
                      <FiCreditCard />
                      Mark paid
                    </button>
                  )}
                  <button onClick={() => sendReminder(s)} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50 text-sm inline-flex items-center justify-center gap-1">
                    <FiBell />
                    Remind
                  </button>
                  <button onClick={() => getParentLink(s)} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-blue-100 text-blue-700 bg-blue-50 text-sm inline-flex items-center justify-center gap-1">
                    <FiLink2 />
                    Parent link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <div className="p-3 border-b bg-gray-50 text-sm text-gray-600">
              Emails and WhatsApp messages sent for payment due, package expiring, and parent renewal requests.
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Sent at</th>
                  <th className="text-left p-3">Recipient</th>
                  <th className="text-left p-3">Channel</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {reminderHistory.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">No reminder messages yet. Send one from the Subscriptions tab.</td></tr>
                )}
                {reminderHistory.map(log => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="p-3 text-sm">{new Date(log.sentAt).toLocaleString()}</td>
                    <td className="p-3">{log.recipient}</td>
                    <td className="p-3">{log.channel}</td>
                    <td className="p-3 text-sm">{log.templateId}</td>
                    <td className="p-3">
                      <span className={log.status === 'Sent' ? 'text-green-600' : 'text-red-600'}>{log.status}</span>
                    </td>
                    <td className="p-3 text-sm text-red-600">{log.errorMessage ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {reminderHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border p-4 text-center text-gray-500">
                No reminder messages yet.
              </div>
            ) : (
              reminderHistory.map(log => (
                <div key={log.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                  <div className="text-sm text-gray-500">{new Date(log.sentAt).toLocaleString()}</div>
                  <div className="font-semibold mt-1">{log.recipient}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {log.channel} · {log.templateId}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={log.status === 'Sent' ? 'text-green-700' : 'text-red-700 font-medium'}>
                      {log.status}
                    </span>
                  </div>
                  {log.errorMessage && (
                    <div className="text-xs text-red-600 mt-1">
                      {log.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New subscription</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Student *</label>
                <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required className="w-full border rounded px-3 py-2">
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Package *</label>
                <select value={form.packageId} onChange={e => setForm(f => ({ ...f, packageId: e.target.value }))} required className="w-full border rounded px-3 py-2">
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start date *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment status</label>
                  <select value={form.paymentStatus} onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))} className="w-full border rounded px-3 py-2">
                    <option value="Due">Due</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment method</label>
                  <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border rounded px-3 py-2">
                    <option value="Cash">Cash</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Venmo">Venmo</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'payment' && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Record payment</h2>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount *</label>
                <input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: Number(e.target.value) }))} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} className="w-full border rounded px-3 py-2">
                  <option value="Cash">Cash</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Venmo">Venmo</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'link' && parentLinkUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Parent portal link</h2>
            <p className="text-sm text-gray-500 mb-2">Share this link with the parent (read-only view + request renewal).</p>
            <input readOnly value={parentLinkUrl} className="w-full border rounded px-3 py-2 text-sm bg-gray-50" />
            <div className="mt-3">
              <LinkShare
                url={parentLinkUrl}
                title="Parent portal link"
                text="Use this parent portal link for schedule and renewal updates."
                variant="compact"
              />
            </div>
            <button type="button" onClick={() => setModal(null)} className="mt-3 px-4 py-2 border rounded hover:bg-gray-50 inline-flex items-center gap-2">
              <FiX />
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
