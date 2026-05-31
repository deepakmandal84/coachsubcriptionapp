import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { subscriptionsApi, studentsApi, packagesApi, messageLogsApi } from '../api'
import { FiBarChart2, FiClock, FiCreditCard, FiPlus } from 'react-icons/fi'
import LinkShare from '../components/LinkShare'
import SubscriptionMonthlyInsights from '../components/SubscriptionMonthlyInsights'
import SubscriptionRowActions from '../components/SubscriptionRowActions'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import ConfirmDialog from '../components/ConfirmDialog'
import { TableSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../context/ToastContext'
import { formatError } from '../utils/formatError'

const REMINDER_TEMPLATES = 'PaymentDue,PackageExpiring,RequestRenewal'

export default function Subscriptions() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'subscriptions'
  const setActiveTab = (tab) => {
    if (tab === 'subscriptions') setSearchParams({})
    else setSearchParams({ tab })
  }
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [reminderHistory, setReminderHistory] = useState([])
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ studentId: '', packageId: '', startDate: new Date().toISOString().slice(0, 10), paymentStatus: 'Due', paymentMethod: 'Cash' })
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Cash', notes: '' })
  const [parentLinkUrl, setParentLinkUrl] = useState('')
  const [renewalTx, setRenewalTx] = useState([])

  function load() {
    setLoading(true)
    subscriptionsApi
      .list()
      .then(setList)
      .catch((e) => setErr(formatError(e)))
      .finally(() => setLoading(false))
    studentsApi.list().then(setStudents).catch(() => {})
    packagesApi.list().then(setPackages).catch(() => {})
  }

  const dueCount = useMemo(() => list.filter((s) => s.paymentStatus === 'Due').length, [list])
  const filteredList = useMemo(
    () => (paymentFilter === 'due' ? list.filter((s) => s.paymentStatus === 'Due') : list),
    [list, paymentFilter]
  )

  function loadReminderHistory() {
    messageLogsApi
      .list({ template: REMINDER_TEMPLATES })
      .then(setReminderHistory)
      .catch((e) => setErr(formatError(e)))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (searchParams.get('filter') === 'due') setPaymentFilter('due')
  }, [searchParams])
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
      toast.success('Subscription created')
      load()
    } catch (e) {
      setErr(formatError(e))
    }
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
      toast.success('Payment recorded')
      load()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  async function sendReminder(sub) {
    try {
      setErr('')
      await subscriptionsApi.sendReminder(sub.id)
      toast.success(`Reminder sent to ${sub.studentName}`)
      load()
      if (activeTab === 'history') loadReminderHistory()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  async function getParentLink(sub) {
    try {
      const res = await subscriptionsApi.getParentLink(sub.studentId, sub.id)
      setParentLinkUrl(res.url)
      setSelected(sub)
      setModal('link')
    } catch (e) {
      setErr(formatError(e))
    }
  }

  function openConfirmRenewal(sub) {
    setSelected(sub)
    setModal('confirmRenewal')
  }

  async function confirmRenewal() {
    if (!selected) return
    try {
      await subscriptionsApi.confirmRenewal(selected.id)
      toast.success(`Renewal confirmed for ${selected.studentName}`)
      setModal(null)
      load()
    } catch (e) {
      setErr(formatError(e))
    }
  }

  async function openRenewalHistory(sub) {
    setSelected(sub)
    try {
      const rows = await subscriptionsApi.renewalTransactions(sub.id)
      setRenewalTx(rows || [])
      setModal('renewalHistory')
    } catch (e) {
      setErr(formatError(e))
    }
  }

  const tabItems = [
    { id: 'subscriptions', label: 'All subscriptions', icon: FiCreditCard, badge: dueCount },
    { id: 'insights', label: 'Monthly insights', icon: FiBarChart2 },
    { id: 'history', label: 'Reminders', icon: FiClock },
  ]

  return (
    <div>
      <PageHeader
        icon={FiCreditCard}
        title="Subscriptions"
        description="Manage packages sold to students, payments, and renewal requests."
        action={
          activeTab === 'subscriptions' ? (
            <Button onClick={openCreate}>
              <FiPlus />
              New subscription
            </Button>
          ) : null
        }
      />

      <div className="mb-6">
        <Tabs tabs={tabItems} active={activeTab} onChange={setActiveTab} />
      </div>

      {err && (
        <div className="mb-4">
          <Alert variant="error" onDismiss={() => setErr('')}>
            {err}
          </Alert>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                paymentFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              All ({list.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('due')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                paymentFilter === 'due' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Payment due ({dueCount})
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : filteredList.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiCreditCard}
                title={paymentFilter === 'due' ? 'No payments due' : 'No subscriptions yet'}
                description={
                  paymentFilter === 'due'
                    ? 'All caught up — no outstanding payments.'
                    : 'Create a subscription when a student buys a package.'
                }
                actionLabel={paymentFilter === 'all' ? 'New subscription' : undefined}
                onAction={paymentFilter === 'all' ? openCreate : undefined}
              />
            </Card>
          ) : (
            <>
              <Card padding={false} className="hidden md:block overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">Student</th>
                      <th className="text-left p-3 font-medium text-slate-600">Package</th>
                      <th className="text-left p-3 font-medium text-slate-600">Expiry</th>
                      <th className="text-left p-3 font-medium text-slate-600">Remaining</th>
                      <th className="text-left p-3 font-medium text-slate-600">Payment</th>
                      <th className="text-right p-3 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-900">{s.studentName}</td>
                        <td className="p-3 text-slate-600">{s.packageName}</td>
                        <td className="p-3 text-slate-600">{new Date(s.expiryDate).toLocaleDateString()}</td>
                        <td className="p-3 text-slate-600">{s.remainingSessions ?? '–'}</td>
                        <td className="p-3">
                          <Badge variant={s.paymentStatus === 'Due' ? 'warning' : 'success'}>{s.paymentStatus}</Badge>
                          {s.hasPendingRenewal && (
                            <Badge variant="info" className="ml-1">
                              Renewal
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <SubscriptionRowActions
                            sub={s}
                            onMarkPaid={() => openPayment(s)}
                            onRemind={() => sendReminder(s)}
                            onParentLink={() => getParentLink(s)}
                            onConfirmRenewal={() => openConfirmRenewal(s)}
                            onRenewalHistory={() => openRenewalHistory(s)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <div className="md:hidden space-y-3">
                {filteredList.map((s) => (
                  <Card key={s.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{s.studentName}</div>
                        <div className="text-sm text-slate-500 mt-0.5">{s.packageName}</div>
                      </div>
                      <Badge variant={s.paymentStatus === 'Due' ? 'warning' : 'success'}>{s.paymentStatus}</Badge>
                    </div>
                    <div className="text-sm text-slate-600 mt-3 space-y-1">
                      <div>Expires {new Date(s.expiryDate).toLocaleDateString()}</div>
                      <div>Sessions left: {s.remainingSessions ?? '–'}</div>
                    </div>
                    <SubscriptionRowActions
                      compact
                      sub={s}
                      onMarkPaid={() => openPayment(s)}
                      onRemind={() => sendReminder(s)}
                      onParentLink={() => getParentLink(s)}
                      onConfirmRenewal={() => openConfirmRenewal(s)}
                      onRenewalHistory={() => openRenewalHistory(s)}
                    />
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'insights' && <SubscriptionMonthlyInsights />}

      {activeTab === 'history' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Emails and WhatsApp for payment due, expiring packages, and renewal requests.
          </p>
          {reminderHistory.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiClock}
                title="No reminders sent yet"
                description="Send a reminder from the All subscriptions tab when payment is due."
              />
            </Card>
          ) : (
            <>
              <Card padding={false} className="hidden md:block overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">Sent at</th>
                      <th className="text-left p-3 font-medium text-slate-600">Recipient</th>
                      <th className="text-left p-3 font-medium text-slate-600">Channel</th>
                      <th className="text-left p-3 font-medium text-slate-600">Type</th>
                      <th className="text-left p-3 font-medium text-slate-600">Status</th>
                      <th className="text-left p-3 font-medium text-slate-600">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderHistory.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 last:border-0">
                        <td className="p-3 text-slate-600">{new Date(log.sentAt).toLocaleString()}</td>
                        <td className="p-3 font-medium text-slate-900">{log.recipient}</td>
                        <td className="p-3">{log.channel}</td>
                        <td className="p-3 text-slate-600">{log.templateId}</td>
                        <td className="p-3">
                          <Badge variant={log.status === 'Sent' ? 'success' : 'danger'}>{log.status}</Badge>
                        </td>
                        <td className="p-3 text-sm text-red-600">{log.errorMessage ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="md:hidden space-y-3">
                {reminderHistory.map((log) => (
                  <Card key={log.id}>
                    <div className="text-sm text-slate-500">{new Date(log.sentAt).toLocaleString()}</div>
                    <div className="font-semibold text-slate-900 mt-1">{log.recipient}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {log.channel} · {log.templateId}
                    </div>
                    <Badge variant={log.status === 'Sent' ? 'success' : 'danger'} className="mt-2">
                      {log.status}
                    </Badge>
                    {log.errorMessage && <p className="text-xs text-red-600 mt-2">{log.errorMessage}</p>}
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {modal === 'create' && (
        <Modal
          title="New subscription"
          onClose={() => setModal(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" form="sub-create-form">
                Create
              </Button>
            </div>
          }
        >
          <form id="sub-create-form" onSubmit={handleCreate} className="space-y-3">
            <Select label="Student *" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select label="Package *" value={form.packageId} onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))} required>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input label="Start date *" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Payment status" value={form.paymentStatus} onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}>
                <option value="Due">Due</option>
                <option value="Paid">Paid</option>
              </Select>
              <Select label="Method" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="Cash">Cash</option>
                <option value="Zelle">Zelle</option>
                <option value="Venmo">Venmo</option>
                <option value="Card">Card</option>
              </Select>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'payment' && selected && (
        <Modal
          title={`Record payment — ${selected.studentName}`}
          onClose={() => setModal(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" form="sub-payment-form">
                Save
              </Button>
            </div>
          }
        >
          <form id="sub-payment-form" onSubmit={handlePayment} className="space-y-3">
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              min="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              required
            />
            <Select label="Method" value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}>
              <option value="Cash">Cash</option>
              <option value="Zelle">Zelle</option>
              <option value="Venmo">Venmo</option>
              <option value="Card">Card</option>
            </Select>
            <Input label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} />
          </form>
        </Modal>
      )}

      {modal === 'link' && parentLinkUrl && (
        <Modal
          title="Parent portal link"
          onClose={() => setModal(null)}
          footer={
            <Button variant="secondary" onClick={() => setModal(null)}>
              Close
            </Button>
          }
        >
          <p className="text-sm text-slate-600 mb-3">Share with the parent for read-only schedule and renewal requests.</p>
          <Input readOnly value={parentLinkUrl} className="mb-3" />
          <LinkShare
            url={parentLinkUrl}
            title="Parent portal link"
            text="Use this parent portal link for schedule and renewal updates."
            variant="compact"
          />
        </Modal>
      )}

      <ConfirmDialog
        open={modal === 'confirmRenewal' && !!selected}
        title="Confirm renewal"
        description={selected ? `Confirm that ${selected.studentName} has renewed their package?` : ''}
        confirmLabel="Yes, renewed"
        variant="primary"
        onConfirm={confirmRenewal}
        onCancel={() => setModal(null)}
      />

      {modal === 'renewalHistory' && selected && (
        <Modal wide title="Renewal history" onClose={() => setModal(null)} footer={<Button variant="secondary" onClick={() => setModal(null)}>Close</Button>}>
          <p className="text-sm text-slate-600 mb-3">{selected.studentName}</p>
          {renewalTx.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No renewal transactions yet.</p>
          ) : (
            <div className="overflow-auto border border-slate-200 rounded-lg max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-600">Requested</th>
                    <th className="text-left p-2 font-medium text-slate-600">Confirmed</th>
                    <th className="text-left p-2 font-medium text-slate-600">Package</th>
                  </tr>
                </thead>
                <tbody>
                  {renewalTx.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-2">{new Date(r.requestedAt).toLocaleString()}</td>
                      <td className="p-2">{new Date(r.confirmedAt).toLocaleString()}</td>
                      <td className="p-2">{r.packageName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
