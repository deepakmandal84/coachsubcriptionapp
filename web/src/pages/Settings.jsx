import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { coachApi } from '../api'
import { PACKAGE_CATEGORIES, getThemeColorForCategory } from '../constants/categories'
import { FaEnvelope, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { FiCopy, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'

function buildPublicScheduleUrl(coach) {
  if (typeof window === 'undefined' || !coach?.scheduleShareToken) return ''
  const origin = window.location.origin
  const slug = coach.scheduleShareSlug?.trim()
  const key = slug ? slug.toLowerCase() : coach.scheduleShareToken
  return `${origin}/${encodeURIComponent(key)}/info`
}

export default function Settings() {
  const { coach, refresh } = useAuth()
  const isStaffCoach = coach?.role === 'Coach' && !!coach?.clubTenantId
  const isClubOwner = coach?.role === 'Coach' && !coach?.clubTenantId
  const [ownerTab, setOwnerTab] = useState('branding')
  const [form, setForm] = useState({
    name: coach?.name ?? '',
    academyName: coach?.academyName ?? '',
    academyType: coach?.academyType ?? '',
    academyTypeOther: '',
    primaryColor: coach?.primaryColor ?? '#2563eb',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const [scheduleTokenBusy, setScheduleTokenBusy] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState('')
  const [team, setTeam] = useState([])
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    canCreateSessions: false,
    canManageStudents: false,
  })
  const [staffErr, setStaffErr] = useState('')
  const [staffOk, setStaffOk] = useState('')
  const [editCoach, setEditCoach] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    canCreateSessions: false,
    canManageStudents: false,
    newPassword: '',
  })
  const [editErr, setEditErr] = useState('')

  useEffect(() => {
    if (!isClubOwner) return
    coachApi.team().then(setTeam).catch(() => setTeam([]))
  }, [isClubOwner])

  useEffect(() => {
    if (coach) {
      const isPredefined = PACKAGE_CATEGORIES.includes(coach.academyType)
      setForm(f => ({
        ...f,
        name: coach.name ?? '',
        academyName: coach.academyName ?? '',
        academyType: isPredefined ? coach.academyType : (coach.academyType ? 'Other' : ''),
        academyTypeOther: isPredefined ? '' : (coach.academyType || ''),
        primaryColor: coach.primaryColor ?? '#2563eb',
      }))
    }
  }, [coach])

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setSaved(false)
    const academyTypeValue = form.academyType === 'Other' ? (form.academyTypeOther || '').trim() : (form.academyType || '')
    const payload = {
      name: form.name,
      academyName: form.academyName,
      academyType: academyTypeValue || undefined,
      primaryColor: form.primaryColor,
    }
    if (form.academyType && form.academyType !== 'Other')
      payload.primaryColor = getThemeColorForCategory(form.academyType)
    try {
      await coachApi.updateMe(payload)
      if (logoFile) {
        await coachApi.uploadLogo(logoFile)
        setLogoFile(null)
      }
      await refresh()
      setSaved(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  async function handleAddStaff() {
    setStaffErr('')
    setStaffOk('')
    try {
      await coachApi.createStaffCoach({
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        canCreateSessions: staffForm.canCreateSessions,
        canManageStudents: staffForm.canManageStudents,
      })
      setStaffOk('Coach added. They can sign in with the email and password you set.')
      setStaffForm({
        name: '',
        email: '',
        password: '',
        canCreateSessions: false,
        canManageStudents: false,
      })
      const t = await coachApi.team()
      setTeam(t)
    } catch (err) {
      setStaffErr(err instanceof Error ? err.message : 'Could not add coach')
    }
  }

  async function handleSaveEditCoach() {
    if (!editCoach) return
    setEditErr('')
    try {
      await coachApi.updateStaffCoach(editCoach.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        canCreateSessions: editForm.canCreateSessions,
        canManageStudents: editForm.canManageStudents,
        newPassword: editForm.newPassword.trim() || undefined,
      })
      setEditCoach(null)
      const t = await coachApi.team()
      setTeam(t)
      setStaffOk('Coach updated.')
      setTimeout(() => setStaffOk(''), 3000)
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Could not update coach')
    }
  }

  async function handleDeleteCoach(m) {
    if (m.isOwner) return
    if (!confirm(`Remove ${m.name} from the club? They will be unassigned from all sessions.`)) return
    setStaffErr('')
    try {
      await coachApi.deleteStaffCoach(m.id)
      const t = await coachApi.team()
      setTeam(t)
      setStaffOk('Coach removed.')
      setTimeout(() => setStaffOk(''), 3000)
    } catch (e) {
      setStaffErr(e instanceof Error ? e.message : 'Could not remove coach')
    }
  }

  function openEditCoach(m) {
    if (m.isOwner) return
    setEditCoach(m)
    setEditForm({
      name: m.name,
      email: m.email,
      canCreateSessions: m.canCreateSessions,
      canManageStudents: m.canManageStudents,
      newPassword: '',
    })
    setEditErr('')
  }

  async function handleGeneratePublicScheduleLink() {
    setScheduleMsg('')
    setErr('')
    setScheduleTokenBusy(true)
    try {
      const r = await coachApi.regenerateScheduleShareToken()
      await refresh()
      const origin = window.location.origin
      const key = r.slug?.trim() ? r.slug.trim().toLowerCase() : r.token
      const path = `${origin}/${encodeURIComponent(key)}/info`
      await navigator.clipboard.writeText(path)
      setScheduleMsg('Copied to clipboard.')
      setTimeout(() => setScheduleMsg(''), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to generate link')
    } finally {
      setScheduleTokenBusy(false)
    }
  }

  async function handleCopyPublicScheduleLink() {
    if (!coach?.scheduleShareToken) return
    setScheduleMsg('')
    setErr('')
    const path = buildPublicScheduleUrl(coach)
    try {
      await navigator.clipboard.writeText(path)
      setScheduleMsg('Copied to clipboard.')
      setTimeout(() => setScheduleMsg(''), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not copy')
    }
  }

  function handleShareScheduleWhatsApp() {
    if (!coach?.scheduleShareToken) return
    const path = buildPublicScheduleUrl(coach)
    const msg = `Class schedule\n${path}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  function handleShareScheduleEmail() {
    if (!coach?.scheduleShareToken) return
    const path = buildPublicScheduleUrl(coach)
    setScheduleMsg('')
    setErr('')
    window.location.href = `mailto:?subject=${encodeURIComponent('Class schedule')}&body=${encodeURIComponent(`Hi,\n\n${path}`)}`
  }

  async function handleShareScheduleInstagram() {
    if (!coach?.scheduleShareToken) return
    const path = buildPublicScheduleUrl(coach)
    setScheduleMsg('')
    setErr('')
    try {
      await navigator.clipboard.writeText(path)
      setScheduleMsg('Link copied — paste in Instagram.')
      setTimeout(() => setScheduleMsg(''), 3000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not copy')
    }
  }

  const scheduleIconBtnClass =
    'shrink-0 p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 inline-flex items-center justify-center'

  const brandingForm = (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Your name</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Academy / business name</label>
        <input value={form.academyName} onChange={e => setForm(f => ({ ...f, academyName: e.target.value }))} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Academy type (white-label theme)</label>
        <select value={form.academyType} onChange={e => setForm(f => ({ ...f, academyType: e.target.value, academyTypeOther: '', primaryColor: e.target.value ? getThemeColorForCategory(e.target.value) : f.primaryColor }))} className="w-full border rounded px-3 py-2">
          <option value="">— Select —</option>
          {PACKAGE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="Other">Other (add your own)</option>
        </select>
        {form.academyType === 'Other' && (
          <input
            type="text"
            placeholder="e.g. Basketball, Tennis"
            value={form.academyTypeOther}
            onChange={e => setForm(f => ({ ...f, academyTypeOther: e.target.value }))}
            className="w-full border rounded px-3 py-2 mt-2"
          />
        )}
        {form.academyType && form.academyType !== 'Other' && (
          <p className="text-xs text-gray-500 mt-1">Theme applied: <span className="font-mono" style={{ color: getThemeColorForCategory(form.academyType) }}>{getThemeColorForCategory(form.academyType)}</span></p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Primary color (hex)</label>
        <div className="flex gap-2 items-center">
          <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="h-10 w-14 rounded border cursor-pointer" />
          <input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1 border rounded px-3 py-2 font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Logo</label>
        {coach?.logoUrl && <img src={coach.logoUrl} alt="Logo" className="h-12 mb-2" />}
        <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
      </div>
      <div className="border-t pt-4">
        <h2 className="text-sm font-medium text-gray-800 mb-2">Public class schedule</h2>
        <p className="text-xs text-gray-500 mb-3">
          Anyone with the link can view upcoming classes and sign up using email or phone on their student profile.
        </p>
        {coach?.scheduleShareToken ? (
          <div className="flex items-start gap-2 mb-1">
            <p className="text-xs font-mono break-all text-gray-800 flex-1 min-w-0 leading-relaxed">
              {buildPublicScheduleUrl(coach)}
            </p>
            <div className="shrink-0 flex items-center gap-1 mt-0.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleCopyPublicScheduleLink}
                disabled={scheduleTokenBusy}
                aria-label="Copy link"
                title="Copy link"
                className={scheduleIconBtnClass}
              >
                <FiCopy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShareScheduleWhatsApp}
                disabled={scheduleTokenBusy}
                aria-label="Share on WhatsApp"
                title="Share on WhatsApp"
                className={scheduleIconBtnClass}
              >
                <FaWhatsapp className="w-4 h-4" style={{ color: '#25D366' }} />
              </button>
              <button
                type="button"
                onClick={handleShareScheduleEmail}
                disabled={scheduleTokenBusy}
                aria-label="Share by email"
                title="Share by email"
                className={scheduleIconBtnClass}
              >
                <FaEnvelope className="w-4 h-4 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={handleShareScheduleInstagram}
                disabled={scheduleTokenBusy}
                aria-label="Copy for Instagram"
                title="Copy link to paste in Instagram"
                className={`${scheduleIconBtnClass} p-1`}
              >
                <span
                  className="inline-flex items-center justify-center rounded p-0.5"
                  style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}
                >
                  <FaInstagram className="w-3.5 h-3.5 text-white" />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGeneratePublicScheduleLink}
            disabled={scheduleTokenBusy}
            className="px-3 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 disabled:opacity-50"
          >
            Generate link
          </button>
        )}
        {scheduleMsg && <p className="text-xs text-green-600 mt-2">{scheduleMsg}</p>}
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
    </form>
  )

  if (isStaffCoach) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Profile</h1>
        <p className="text-gray-600 mb-6">
          You are signed in as a staff coach. Academy branding, packages, subscriptions, and public schedule links are managed by the club owner. Open <strong>Sessions</strong> for classes you are assigned to and mark attendance there.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setErr('')
            setSaved(false)
            try {
              await coachApi.updateMe({ name: form.name })
              await refresh()
              setSaved(true)
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Failed')
            }
          }}
          className="max-w-md space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Your name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2" />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          {saved && <p className="text-green-600 text-sm">Saved.</p>}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save name</button>
        </form>
      </div>
    )
  }

  if (isClubOwner) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        {err && <p className="text-red-600 mb-2">{err}</p>}
        {saved && ownerTab === 'branding' && <p className="text-green-600 mb-2">Saved.</p>}
        {staffErr && <p className="text-red-600 mb-2 text-sm">{staffErr}</p>}
        {staffOk && <p className="text-green-600 mb-2 text-sm">{staffOk}</p>}

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setOwnerTab('branding')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${ownerTab === 'branding' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Branding & schedule
          </button>
          <button
            type="button"
            onClick={() => setOwnerTab('coaches')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg inline-flex items-center gap-2 ${ownerTab === 'coaches' ? 'bg-white border border-b-0 border-gray-200 -mb-px text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <FiUsers className="text-base" />
            Coaches
          </button>
        </div>

        {ownerTab === 'branding' && brandingForm}

        {ownerTab === 'coaches' && (
          <div className="max-w-xl space-y-8">
            <p className="text-sm text-gray-600">
              Invite coaches with their <strong>full name</strong> and login. They can always <strong>mark attendance</strong> on sessions they are assigned to. Use the checkboxes to allow creating sessions or managing students.
            </p>

            <div>
              <h2 className="text-lg font-semibold mb-3">Your team</h2>
              <ul className="text-sm border rounded-xl divide-y bg-gray-50 overflow-hidden">
                {team.map(m => (
                  <li key={m.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-gray-500 text-xs truncate">{m.email}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.isOwner && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">Owner</span>
                        )}
                        {!m.isOwner && m.canCreateSessions && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Sessions</span>
                        )}
                        {!m.isOwner && m.canManageStudents && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Students</span>
                        )}
                        {!m.isOwner && !m.canCreateSessions && !m.canManageStudents && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Attendance only</span>
                        )}
                      </div>
                    </div>
                    {!m.isOwner && (
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openEditCoach(m)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-white text-blue-700 border-blue-200">
                          <FiEdit2 /> Edit
                        </button>
                        <button type="button" onClick={() => handleDeleteCoach(m)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-red-50 text-red-700 border-red-200">
                          <FiTrash2 /> Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
                {team.length === 0 && <li className="px-4 py-3 text-gray-500">Loading…</li>}
              </ul>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold mb-3">Add coach</h2>
              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Coach full name</label>
                  <input required value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Email (login)</label>
                  <input required type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Initial password</label>
                  <input required type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={staffForm.canCreateSessions} onChange={e => setStaffForm(f => ({ ...f, canCreateSessions: e.target.checked }))} />
                  Can create &amp; edit sessions
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={staffForm.canManageStudents} onChange={e => setStaffForm(f => ({ ...f, canManageStudents: e.target.checked }))} />
                  Can add &amp; edit students
                </label>
                <p className="text-xs text-gray-500">Attendance: always allowed on sessions this coach is assigned to.</p>
                <button type="button" onClick={handleAddStaff} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Add coach</button>
              </div>
            </div>
          </div>
        )}

        {editCoach && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditCoach(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Edit coach</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Name</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editForm.canCreateSessions} onChange={e => setEditForm(f => ({ ...f, canCreateSessions: e.target.checked }))} />
                  Can create &amp; edit sessions
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editForm.canManageStudents} onChange={e => setEditForm(f => ({ ...f, canManageStudents: e.target.checked }))} />
                  Can add &amp; edit students
                </label>
                <div>
                  <label className="block text-xs font-medium text-gray-600">New password (optional)</label>
                  <input type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" placeholder="Leave blank to keep current" />
                </div>
                {editErr && <p className="text-red-600 text-xs">{editErr}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={handleSaveEditCoach} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
                  <button type="button" onClick={() => setEditCoach(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Settings & branding</h1>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {saved && <p className="text-green-600 mb-2">Saved.</p>}
      {brandingForm}
    </div>
  )
}
