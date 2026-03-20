import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { coachApi } from '../api'
import { PACKAGE_CATEGORIES, getThemeColorForCategory } from '../constants/categories'
import LinkShare from '../components/LinkShare'

export default function Settings() {
  const { coach, refresh } = useAuth()
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

  async function handleGenerateScheduleLink() {
    setScheduleMsg('')
    setScheduleTokenBusy(true)
    try {
      const r = await coachApi.regenerateScheduleShareToken()
      await refresh()
      const path = `${window.location.origin}/s/${r.token}`
      setScheduleMsg(path)
      await navigator.clipboard.writeText(path)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to generate link')
    } finally {
      setScheduleTokenBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Settings & branding</h1>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {saved && <p className="text-green-600 mb-2">Saved.</p>}
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
          {coach?.scheduleShareToken && (
            <p className="text-xs font-mono break-all text-gray-600 mb-2">
              {typeof window !== 'undefined' ? `${window.location.origin}/s/${coach.scheduleShareToken}` : ''}
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerateScheduleLink}
            disabled={scheduleTokenBusy}
            className="px-3 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {coach?.scheduleShareToken ? 'Regenerate & copy link' : 'Generate & copy link'}
          </button>
          {scheduleMsg && <p className="text-xs text-green-600 mt-2">Copied to clipboard: {scheduleMsg}</p>}
          {coach?.scheduleShareToken && (
            <div className="mt-3">
              <LinkShare
                url={scheduleMsg || (typeof window !== 'undefined' ? `${window.location.origin}/s/${coach.scheduleShareToken}` : '')}
                title="Share schedule"
                text="Join my class schedule"
              />
            </div>
          )}
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
      </form>
    </div>
  )
}
